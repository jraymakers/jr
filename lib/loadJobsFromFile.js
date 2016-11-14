const childProcessFunctions = require('./childProcessFunctions');
const createRun = require('./createRun');
const executeRun = require('./executeRun');
const path = require('path');

// function loadJobFromFile(jobsFilePath, jobName) {
//   const jobDefs = loadJobsFromFile(jobsFilePath);
//   const jobDef = jobDefs[jobName];
//   if (!jobDef) {
//     throw new Error(`Job "${jobName}" not found in jobs file "${jobsFilePath}".`);
//   }
//   return jobDef;
// }

function loadJobsFromFile(jobsFilePath, opts) {
  try {
    const jobDefsFn = require(jobsFilePath);
    if (typeof jobDefsFn !== 'function') {
      throw new Error(`Must export a function.`);
    }
    if (!jobDefsFn.jobDefsCache) {
      jobDefsFn.jobDefsCache = jobDefsFn(Object.assign({
        // import: (relativeJobsFilePath, jobName) =>
        //   loadJobFromFile(path.resolve(path.dirname(jobsFilePath), relativeJobsFilePath), jobName),
        runJobsFromFile: (relativeJobsFilePath, jobNamesToRun) => {
          const absoluteJobsFilePath = path.resolve(path.dirname(jobsFilePath), relativeJobsFilePath);
          const jobDefs = loadJobsFromFile(absoluteJobsFilePath, opts);
          return executeRun(createRun(jobNamesToRun, jobDefs));
        }
      }, childProcessFunctions));
    }
    return jobDefsFn.jobDefsCache;
  } catch (err) {
    throw new Error(`Error loading jobs file "${jobsFilePath}": ${err}`);
  }
}

module.exports = loadJobsFromFile;
