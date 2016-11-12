const childProcessFunctions = require('./childProcessFunctions');
const createRun = require('./createRun');
const executeRun = require('./executeRun');
const loadJobsFromFile = require('./loadJobsFromFile');

function runJobs(jobDefs, jobNamesToRun, opts) {
  return executeRun(createRun(jobNamesToRun, jobDefs, opts));
}

function runJobsFromFile(jobsFilePath, jobNamesToRun, opts) {
  return runJobs(loadJobsFromFile(jobsFilePath), jobNamesToRun, opts);
}

module.exports = Object.assign({
  loadJobsFromFile: loadJobsFromFile,
  runJobs: runJobs,
  runJobsFromFile: runJobsFromFile
}, childProcessFunctions);
