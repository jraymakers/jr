const childProcessFunctions = require('./childProcessFunctions');
const createRun = require('./createRun');
const executeRun = require('./executeRun');
const path = require('path');

// function loadJob(jobsFilePath, jobName) {
//   const jobDefs = loadJobs(jobsFilePath);
//   const jobDef = jobDefs[jobName];
//   if (!jobDef) {
//     throw new Error(`Job "${jobName}" not found in jobs file "${jobsFilePath}".`);
//   }
//   return jobDef;
// }

function loadJobs(jobsFilePath, opts) {
  try {
    const jobDefsFn = require(jobsFilePath);
    if (typeof jobDefsFn !== 'function') {
      throw new Error(`Must export a function.`);
    }
    if (!jobDefsFn.jobDefsCache) {
      jobDefsFn.jobDefsCache = jobDefsFn(Object.assign({
        // import: (relativeJobsFilePath, jobName) =>
        //   loadJob(path.resolve(path.dirname(jobsFilePath), relativeJobsFilePath), jobName),
        run: (defsOrPath, jobNamesToRun) => {
          let jobDefs;
          if (typeof defsOrPath === 'string') {
            jobDefs = loadJobs(path.resolve(path.dirname(jobsFilePath), relativeJobsFilePath), opts);
          } else {
            jobDefs = defsOrPath;
          }
          return executeRun(createRun(jobDefs, jobNamesToRun));
        }
      }, childProcessFunctions));
    }
    return jobDefsFn.jobDefsCache;
  } catch (err) {
    throw new Error(`Error loading jobs file "${jobsFilePath}": ${err}`);
  }
}

module.exports = loadJobs;
