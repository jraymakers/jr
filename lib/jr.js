const path = require('path');

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
        import: function (relativeJobsFilePath, jobName) {
          return loadJobFromFile(path.resolve(path.dirname(jobsFilePath), relativeJobsFilePath), jobName);
        }
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

function jobDone(run, jobName) {
  delete run.runningJobs[jobName];
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
        jobDone(run, jobName);
      });
}

function waitForOneRunningJob(run) {
  const promises = [];
  for (let runningJob in run.runningJobs) {
    promises.push(runningJob.promise);
  };
  return Promise.race(promises);
}

function waitForRunningJobs(run) {
  if (Object.keys(run.runningJobs).length > 0) {
    return waitForOneRunningJob(run)
      .then(() => {
        return waitForRunningJobs(run);
      });
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
  loadJobsFromFile: loadJobsFromFile,
  runJobs: runJobs,
  runJobsFromFile: runJobsFromFile
};
