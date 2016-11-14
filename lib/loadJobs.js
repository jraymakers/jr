const childProcessFunctions = require('./childProcessFunctions');
const createRun = require('./createRun');
const executeRun = require('./executeRun');
const path = require('path');

function loadJobs(jobsFilePath, opts) {
  try {
    const jobDefsFn = require(jobsFilePath);
    if (typeof jobDefsFn !== 'function') {
      throw new Error(`Must export a function.`);
    }
    if (!jobDefsFn.jobDefsCache) {
      jobDefsFn.jobDefsCache = jobDefsFn(Object.assign({
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
