const childProcessFunctions = require('./childProcessFunctions');
const createRun = require('./createRun');
const executeRun = require('./executeRun');
const loadJobsFromFile = require('./loadJobsFromFile');
const makeLogger = require('./makeLogger');

function runJobs(jobDefs, jobNamesToRun, opts) {
  return executeRun(createRun(jobNamesToRun, jobDefs, opts));
}

function runJobsFromFile(jobsFilePath, jobNamesToRun, opts) {
  return runJobs(loadJobsFromFile(jobsFilePath), jobNamesToRun, opts);
}

module.exports = Object.assign({
  loadJobsFromFile: loadJobsFromFile,
  makeLogger: makeLogger,
  runJobs: runJobs,
  runJobsFromFile: runJobsFromFile
}, childProcessFunctions);
