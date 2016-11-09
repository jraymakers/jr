const path = require('path');
const spawn = require('child_process').spawn;

function logLines(data, log) {
  data.toString().split(/\r\n|\n|\r/).forEach((line) => {
    if (line) {
      log(line);
    }
  });
}

function launcher(command, args, options) {
  return (log) => new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.stdout.on('data', (data) => logLines(data, log));
    child.stderr.on('data', (data) => logLines(data, log));
    child.on('exit', (code) => {
      if (code) {
        reject(code);
      } else {
        resolve();
      }
    });
  });
}

function launch(command, args, options) {
  return (results, log) => launcher(command, args, options)(log);
}

function loadJobFromFile(jobsFilePath, jobName) {
  const jobDefs = loadJobsFromFile(jobsFilePath);
  const jobDef = jobDefs[jobName];
  if (!jobDef) {
    throw new Error(`Job "${jobName}" not found in jobs file "${jobsFilePath}".`);
  }
  return jobDef;
}

function loadJobsFromFile(jobsFilePath) {
  try {
    const jobDefsFn = require(jobsFilePath);
    if (typeof jobDefsFn !== 'function') {
      throw new Error(`Must export a function.`);
    }
    if (!jobDefsFn.jobDefsCache) {
      jobDefsFn.jobDefsCache = jobDefsFn({
        import: (relativeJobsFilePath, jobName) =>
          loadJobFromFile(path.resolve(path.dirname(jobsFilePath), relativeJobsFilePath), jobName),
        launch: launch,
        launcher: launcher
      });
    }
    return jobDefsFn.jobDefsCache;
  } catch (err) {
    throw new Error(`Error loading jobs file "${jobsFilePath}": ${err}`);
  }
}

function defaultLog(jobName, message) {
  console.log(`[${jobName}] ${message}`);
}

function createRun(jobNames, jobDefs, opts) {
  const run = {
    jobs: {},
    jobsWaitingForNeed: {},
    readyJobs: [],
    runningJobs: {},
    log: opts && opts.log ? opts.log : defaultLog,
    beforeJob: opts && opts.beforeJob,
    afterJob: opts && opts.afterJob
  };
  const queue = [];
  const enqueued = {};
  function maybeEnqueue(jobName) {
    if (!enqueued[jobName]) {
      queue.push(jobName);
      enqueued[jobName] = true;
    }
  }
  jobNames.forEach((jobName) => {
    maybeEnqueue(jobName);
  })
  while (queue.length > 0) {
    const currentJobName = queue.shift();
    const jobDef = jobDefs[currentJobName];
    if (!jobDef) {
      throw new Error(`ERROR: Job ${currentJobName} not found.`);
    }
    const job = {
      def: jobDef
    };
    if (jobDef.needs) {
      const needs = jobDef.needs;
      if (!Array.isArray(needs)) {
        console.log(`WARNING: Job "${currentJobName}" has a "needs" property that is not an Array.`);
      }
      if (needs.length > 0) {
        job.needsRemaining = needs.length;
        needs.forEach((need) => {
          maybeEnqueue(need);
          let jobsWaitingForNeed = run.jobsWaitingForNeed[need];
          if (!jobsWaitingForNeed) {
            jobsWaitingForNeed = [];
            run.jobsWaitingForNeed[need] = jobsWaitingForNeed;
          }
          jobsWaitingForNeed.push(currentJobName);
        });
      }
    }
    run.jobs[currentJobName] = job;
    if (!(job.needsRemaining > 0)) {
      run.readyJobs.push(currentJobName);
    }
  }
  return run;
}

function notifyWaitingJobs(run, jobName) {
  const waitingJobs = run.jobsWaitingForNeed[jobName];
  delete run.jobsWaitingForNeed[jobName];
  if (waitingJobs) {
    waitingJobs.forEach((waitingJobName) => {
      const waitingJob = run.jobs[waitingJobName];
      waitingJob.needsRemaining--;
      if (waitingJob.needsRemaining === 0) {
        startJob(run, waitingJobName);
      }
    });
  }
}

function runJob(run, jobName) {
  const startTime = Date.now();
  const job = run.jobs[jobName];
  const action = job.def.action;
  if (action && typeof action === 'function') {
    const results = {};
    if (job.def.needs) {
      job.def.needs.forEach((need) => {
        results[need] = run.jobs[need].result;
      });
    }
    const log = (message) => run.log(jobName, message);
    let beforePromise;
    if (run.beforeJob) {
      beforePromise = Promise.resolve(run.beforeJob(jobName));
    } else {
      beforePromise = Promise.resolve();
    }
    return beforePromise
      .then(() => Promise.resolve(action(results, log)))
      .then((result) => {
        job.result = result;
        if (run.afterJob) {
          return run.afterJob(jobName, Date.now() - startTime);
        } else {
          return result;
        }
      });
  } else {
    return Promise.resolve();
  }
}

function startJob(run, jobName) {
  run.runningJobs[jobName] =
    runJob(run, jobName)
      .then(() => {
        delete run.runningJobs[jobName];
        notifyWaitingJobs(run, jobName);
      })
      .catch((err) => {
        delete run.runningJobs[jobName];
        return Promise.reject(err);
      });
}

function waitForOneRunningJob(run) {
  const promises = [];
  for (let runningJobName in run.runningJobs) {
    promises.push(run.runningJobs[runningJobName]);
  };
  return Promise.race(promises);
}

function waitForRunningJobs(run) {
  if (Object.keys(run.runningJobs).length > 0) {
    return waitForOneRunningJob(run)
      .then(() => {
        return waitForRunningJobs(run);
      })
      .catch((err) => {
        return Promise.reject(err);
      })
  } else {
    if (Object.keys(run.jobsWaitingForNeed).length > 0) {
      return Promise.reject(new Error('Some jobs are still waiting for a need, but no more jobs are running.'));
    } else {
      return Promise.resolve();
    }
  }
}

function startReadyJobs(run) {
  run.readyJobs.forEach((jobName) => {
    startJob(run, jobName);
  });
  run.readyJobs = [];
}

function executeRun(run) {
  startReadyJobs(run);
  return waitForRunningJobs(run)
}

function runJobs(jobDefs, jobNamesToRun, opts) {
  return executeRun(createRun(jobNamesToRun, jobDefs, opts));
}

function runJobsFromFile(jobsFilePath, jobNamesToRun, opts) {
  return runJobs(loadJobsFromFile(jobsFilePath), jobNamesToRun, opts);
}

module.exports = {
  launch: launch,
  launcher: launcher,
  loadJobsFromFile: loadJobsFromFile,
  runJobs: runJobs,
  runJobsFromFile: runJobsFromFile
};