const childProcessFunctions = require('./childProcessFunctions');
const createRun = require('./createRun');
const executeRun = require('./executeRun');
const makeLogger = require('./makeLogger');

function loadJobs(jobsFilePath, opts) {
  try {
    const jobDefsFn = require(jobsFilePath);
    if (typeof jobDefsFn !== 'function') {
      throw new Error(`Must export a function.`);
    }
    if (!jobDefsFn.jobDefsCache) {
      jobDefsFn.jobDefsCache = jobDefsFn(Object.assign({
        load: wrappedLoadJobs(opts),
        makeLogger: opts && opts.makeLogger || makeLogger,
        run: wrappedRunJobs(opts)
      }, childProcessFunctions));
    }
    return jobDefsFn.jobDefsCache;
  } catch (err) {
    throw new Error(`Error loading jobs file "${jobsFilePath}": ${err}`);
  }
}

function wrappedLoadJobs(outerOpts) {
  return (jobsFilePath, innerOpts) =>
    loadJobs(jobsFilePath, Object.assign({}, outerOpts, innerOpts));
}

function wrappedRunJobs(outerOpts) {
  return (defsOrPath, jobNamesToRun, innerOpts) =>
    runJobs(defsOrPath, jobNamesToRun, Object.assign({}, outerOpts, innerOpts));
}

function getJobDefs(defsOrPath, opts) {
  if (typeof defsOrPath === 'string') {
    return loadJobs(defsOrPath, opts);
  } else {
    return defsOrPath;
  }
}

function runJobs(defsOrPath, jobNamesToRun, opts) {
  return executeRun(createRun(getJobDefs(defsOrPath, opts), jobNamesToRun, opts));
}

const jr = Object.assign({
  load: loadJobs,
  makeLogger: makeLogger,
  run: runJobs
}, childProcessFunctions);

module.exports = jr;
