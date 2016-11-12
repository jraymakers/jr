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

module.exports = createRun;
