function getResultsForJob(run, job) {
  const results = {};
  if (job.def.needs) {
    job.def.needs.forEach((need) => {
      results[need] = run.jobs[need].result;
    });
  }
  return results;
}

function getArgsForJob(run, job) {
  return {
    logger: run.makeLogger(`${run.name?run.name+':':''}${job.name}`),
    results: getResultsForJob(run, job)
  };
}

function beforeJob(run, job) {
  if (run.beforeJob) {
    return Promise.resolve(run.beforeJob(run.name, job.name));
  } else {
    return Promise.resolve();
  }
}

function runJob(run, jobName) {
  const startTime = Date.now();
  const job = run.jobs[jobName];
  const action = job.def.action;
  if (action && typeof action === 'function') {
    return beforeJob(run, job)
      .then(() => Promise.resolve(action(getArgsForJob(run, job))))
      .then((result) => {
        job.result = result;
        if (run.afterJob) {
          return run.afterJob(run.name, jobName, Date.now() - startTime);
        } else {
          return result;
        }
      })
      .catch((err) => {
        return Promise.reject(new Error(`Job "${jobName}" returned error: ${err}`));
      });
  } else {
    return Promise.resolve();
  }
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

function startReadyJobs(run) {
  run.readyJobs.forEach((jobName) => {
    startJob(run, jobName);
  });
  run.readyJobs = [];
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

function executeRun(run) {
  startReadyJobs(run);
  return waitForRunningJobs(run)
}

module.exports = executeRun;
