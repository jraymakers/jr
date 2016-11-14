const childProcessFunctions = require('./childProcessFunctions');
const createRun = require('./createRun');
const executeRun = require('./executeRun');
const loadJobs = require('./loadJobs');
const makeLogger = require('./makeLogger');

function runJobs(defsOrPath, jobNamesToRun, opts) {
  let jobDefs;
  if (typeof defsOrPath === 'string') {
    jobDefs = loadJobs(defsOrPath, opts);
  } else {
    jobDefs = defsOrPath;
  }
  return executeRun(createRun(jobDefs, jobNamesToRun, opts));
}

module.exports = Object.assign({
  load: loadJobs,
  makeLogger: makeLogger,
  run: runJobs
}, childProcessFunctions);
