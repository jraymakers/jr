const makeLogger = require('./makeLogger');

function createRun(jobDefs, jobNames, opts) {
  const run = {
    jobs: {},
    jobsWaitingForNeed: {},
    readyJobs: [],
    runningJobs: {},
    name: opts && opts.runName,
    makeLogger: opts && opts.makeLogger ? opts.makeLogger : makeLogger,
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
      throw new Error(`Job ${currentJobName} not found.`);
    }
    const job = {
      def: jobDef,
      name: currentJobName
    };
    if (jobDef.needs) {
      const needs = jobDef.needs;
      if (!Array.isArray(needs)) {
        throw new Error(`Job "${currentJobName}" has a "needs" property that is not an Array.`);
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
