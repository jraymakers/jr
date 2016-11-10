const jr = require('../');
const path = require('path');
const test = require('tape');

// test data

const singleJob = {
  a: { action: (res, log) => log('a') }
};

const diamondJobs = {
  a: { action: (res, log) => log('a') },
  b: { needs: ['a'], action: (res, log) => log('b') },
  c: { needs: ['a'], action: (res, log) => log('c') },
  d: { needs: ['b', 'c'], action: (res, log) => log('d') },
  e: { needs: ['b'], action: (res, log) => log('e') }
};

const commandAction = {
  run: { action: jr.commandAction('echo message') }
};

const runCommandFn = {
  run: { action: (results, log) => jr.runCommandFn('echo message')(log) }
};

const processAction = {
  run: { action: jr.processAction('echo', ['message']) }
};

const runProcessFn = {
  run: { action: (results, log) => jr.runProcessFn('echo', ['message'])(log) }
};

const scriptAction = {
  run: { action: jr.scriptAction(path.join(__dirname, 'files', 'echo'), ['message']) }
};

const runScriptFn = {
  run: { action: (results, log) => jr.runScriptFn(path.join(__dirname, 'files', 'echo'), ['message'])(log) }
};

// test helpers

function expectDef(t, actual, expected) {
  t.ok(actual);
  if (expected.action) {
    t.equal(typeof actual.action, 'function');
  } else {
    t.false(actual.action);
  }
  if (expected.needs) {
    t.looseEqual(actual.needs, expected.needs);
  } else {
    t.false(actual.needs);
  }
}

function createLogger() {
  const output = [];
  return {
    log: (jobName, message) => output.push({ jobName: jobName, message: message }),
    output: output
  };
}

// loadJobsFromFile

test('loadJobsFromFile given no arguments should throw', (t) => {
  t.throws(() => jr.loadJobsFromFile(),
    /Error loading jobs file "undefined": AssertionError: missing path/);
  t.end();
});

test('loadJobsFromFile given empty string argument should throw', (t) => {
  t.throws(() => jr.loadJobsFromFile(''),
    /Error loading jobs file "": AssertionError: missing path/);
  t.end();
});

test('loadJobsFromFile given empty file should throw', (t) => {
  const p = path.join(__dirname, 'files', 'empty.js');
  t.throws(() => jr.loadJobsFromFile(p),
    new RegExp(`Error loading jobs file "${p}": Error: Must export a function.`));
  t.end();
});

test('loadJobsFromFile given file with single job def should return valid job defs', (t) => {
  const p = path.join(__dirname, 'files', 'single-job.js');
  const jobDefs = jr.loadJobsFromFile(p);
  t.ok(jobDefs);
  expectDef(t, jobDefs.a, { action: true });
  t.end();
});

test('loadJobsFromFile given jobs file with multiple job defs should return valid job defs', (t) => {
  const p = path.join(__dirname, 'files', 'diamond.js');
  const jobDefs = jr.loadJobsFromFile(p);
  t.ok(jobDefs);
  expectDef(t, jobDefs.a, { action: true });
  expectDef(t, jobDefs.b, { needs: ['a'], action: true });
  expectDef(t, jobDefs.c, { needs: ['a'], action: true });
  expectDef(t, jobDefs.d, { needs: ['b', 'c'], action: true });
  expectDef(t, jobDefs.e, { needs: ['b'], action: true });
  t.end();
});

test('loadJobsFromFile given jobs file with import should return valid job definitions', (t) => {
  const p = path.join(__dirname, 'files', 'print-config.js');
  const jobDefs = jr.loadJobsFromFile(p);
  t.ok(jobDefs);
  expectDef(t, jobDefs.config, { action: true });
  expectDef(t, jobDefs.printConfig, { needs: ['config'], action: true });
  t.end();
});

// runJobs

function testRunJobs(t, jobDefs, jobNamesToRun, expectedLogOutput) {
  t.plan(1);
  const logger = createLogger();
  jr.runJobs(jobDefs, jobNamesToRun, { log: logger.log })
    .then(() => {
      t.deepEqual(logger.output, expectedLogOutput);
      t.end();
    });
}

test('runJobs given a single job and name of that job should run that job', (t) => {
  testRunJobs(t, singleJob, ['a'], [
    { jobName: 'a', message: 'a' }
  ]);
});

test('runJobs given multiple jobs and name of a job should run all needed jobs', (t) => {
  testRunJobs(t, diamondJobs, ['d'], [
    { jobName: 'a', message: 'a' },
    { jobName: 'b', message: 'b' },
    { jobName: 'c', message: 'c' },
    { jobName: 'd', message: 'd' }
  ]);
});

test('runJobs given multiple jobs and names of multiple job should run all needed jobs', (t) => {
  testRunJobs(t, diamondJobs, ['d','e'], [
    { jobName: 'a', message: 'a' },
    { jobName: 'b', message: 'b' },
    { jobName: 'c', message: 'c' },
    { jobName: 'e', message: 'e' },
    { jobName: 'd', message: 'd' }
  ]);
});

test('runJobs given a job name that returns a broken promise should return a broken promise', (t) => {
  t.plan(1);
  const jobDefs = {
    a: { action: () => Promise.reject('error from a') }
  };
  jr.runJobs(jobDefs, ['a'])
    .catch((err) => {
      t.equal(err, 'error from a');
      t.end();
    })
});

test('runJobs given a job that uses commandAction runs the given command', (t) => {
  testRunJobs(t, commandAction, ['run'], [
    { jobName: 'run', message: 'message' }
  ]);
});

test('runJobs given a job that uses runCommandFn runs the given command', (t) => {
  testRunJobs(t, runCommandFn, ['run'], [
    { jobName: 'run', message: 'message' }
  ]);
});

test('runJobs given a job that uses processAction runs the given command', (t) => {
  testRunJobs(t, processAction, ['run'], [
    { jobName: 'run', message: 'message' }
  ]);
});

test('runJobs given a job that uses runProcessFn runs the given command', (t) => {
  testRunJobs(t, runProcessFn, ['run'], [
    { jobName: 'run', message: 'message' }
  ]);
});

test('runJobs given a job that uses scriptAction runs the given command', (t) => {
  testRunJobs(t, scriptAction, ['run'], [
    { jobName: 'run', message: 'message' }
  ]);
});

test('runJobs given a job that uses runScriptFn runs the given command', (t) => {
  testRunJobs(t, runScriptFn, ['run'], [
    { jobName: 'run', message: 'message' }
  ]);
});

// runJobsFromFile

function testRunJobsFromFile(t, jobsFileName, jobNamesToRun, expectedLogOutput) {
  t.plan(1);
  const p = path.join(__dirname, 'files', jobsFileName);
  const logger = createLogger();
  jr.runJobsFromFile(p, jobNamesToRun, { log: logger.log })
    .then(() => {
      t.deepEqual(logger.output, expectedLogOutput);
      t.end();
    });
}

test('runJobsFromFile given file with single job and name of that job should run that job', (t) => {
  testRunJobsFromFile(t, 'single-job.js', ['a'], [
    { jobName: 'a', message: 'a' }
  ]);
});

test('runJobsFromFile given file with multiple jobs and name of a job should run all needed jobs', (t) => {
  testRunJobsFromFile(t, 'diamond.js', ['d'], [
    { jobName: 'a', message: 'a' },
    { jobName: 'b', message: 'b' },
    { jobName: 'c', message: 'c' },
    { jobName: 'd', message: 'd' }
  ]);
});

test('runJobsFromFile given file with multiple jobs and names multiple jobs should run all needed jobs', (t) => {
  testRunJobsFromFile(t, 'diamond.js', ['d','e'], [
    { jobName: 'a', message: 'a' },
    { jobName: 'b', message: 'b' },
    { jobName: 'c', message: 'c' },
    { jobName: 'e', message: 'e' },
    { jobName: 'd', message: 'd' }
  ]);
});

test('runJobsFromFile given file with import, with results, and name of a job should run all needed jobs', (t) => {
  testRunJobsFromFile(t, 'print-config.js', ['printConfig'], [
    { jobName: 'printConfig', message: '12345' }
  ]);
});
