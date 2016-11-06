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

function createRun(jobName, jobDefs) {
  const run = {
    jobs: {},
    jobsWaitingForNeed: {},
    readyJobs: [],
    runningJobs: {}
  };
  const queue = [];
  const enqueued = {};
  function maybeEnqueue(jobName) {
    if (!enqueued[jobName]) {
      queue.push(jobName);
      enqueued[jobName] = true;
    }
  }
  maybeEnqueue(jobName);
  while (queue.length > 0) {
    const currentJobName = queue.shift();
    const jobDef = jobDefs[currentJobName];
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

function createRuns(jobNamesToRun, jobDefs) {
  const runs = [];
  jobNamesToRun.forEach((jobName) => {
    runs.push(createRun(jobName, jobDefs));
  });
  return runs;
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
  const job = run.jobs[jobName]
  const action = job.def.action;
  if (action && typeof action === 'function') {
    const results = {};
    if (job.def.needs) {
      job.def.needs.forEach((need) => {
        results[need] = run.jobs[need].result;
      });
    }
    const log = (message) => console.log(`[${jobName}] ${message}`);
    return Promise.resolve(action(results, log))
      .then((result) => {
        job.result = result;
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

function executeRunsFromIndex(runs, index) {
  return executeRun(runs[index])
    .then(() => {
      const newIndex = index + 1;
      if (newIndex < runs.length) {
        return executeRunsFromIndex(runs, newIndex);
      } else {
        return Promise.resolve();
      }
    });
}

function executeRuns(runs) {
  return executeRunsFromIndex(runs, 0);
}

function runJobs(jobDefs, jobNamesToRun) {
  return executeRuns(createRuns(jobNamesToRun, jobDefs));
}

function runJobsFromFile(jobsFilePath, jobNamesToRun) {
  return runJobs(loadJobsFromFile(jobsFilePath), jobNamesToRun);
}

module.exports = {
  loadJobsFromFile: loadJobsFromFile,
  runJobs: runJobs,
  runJobsFromFile: runJobsFromFile
};
