const jr = require('../');
const path = require('path');
const test = require('tape');

const testFilesDir = path.join(__dirname, 'files');

// test data

const singleJob = {
  a: { action: (j) => j.logger.log('a') }
};

const diamondJobs = {
  a: { action: (j) => j.logger.log('a') },
  b: { needs: ['a'], action: (j) => j.logger.log('b') },
  c: { needs: ['a'], action: (j) => j.logger.log('c') },
  d: { needs: ['b', 'c'], action: (j) => j.logger.log('d') },
  e: { needs: ['b'], action: (j) => j.logger.log('e') }
};

const commandAction = {
  run: { action: jr.commandAction('echo message') }
};

const runCommandFn = {
  run: { action: (j) => jr.runCommandFn('echo message')(j.logger) }
};

const echoProcess = process.platform == 'win32' ? 'cmd' : 'echo';
const echoArgs = process.platform == 'win32' ? ['/c', 'echo', 'message'] : ['message'];

const processAction = {
  run: { action: jr.processAction(echoProcess, echoArgs) }
};

const runProcessFn = {
  run: { action: (j) => jr.runProcessFn(echoProcess, echoArgs)(j.logger) }
};

const scriptAction = {
  run: { action: jr.scriptAction(path.join(testFilesDir, 'echo'), ['message']) }
};

const runScriptFn = {
  run: { action: (j) => jr.runScriptFn(path.join(testFilesDir, 'echo'), ['message'])(j.logger) }
};

const scriptActionExitCode0 = {
  run: { action: jr.scriptAction(path.join(testFilesDir, 'exitCode'), ['0']) }
};

const scriptActionExitCode1 = {
  run: { action: jr.scriptAction(path.join(testFilesDir, 'exitCode'), ['1']) }
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

function makeMemoryLogger() {
  const output = [];
  return {
    makeLogger: (prefix) => ({
      error: (message) => output.push({ type: 'error', prefix: prefix, message: message }),
      info:  (message) => output.push({ type: 'info',  prefix: prefix, message: message }),
      log:   (message) => output.push({ type: 'log',   prefix: prefix, message: message }),
      warn:  (message) => output.push({ type: 'warn',  prefix: prefix, message: message })
    }),
    output: output
  };
}

function testRun(t, defsOrPath, jobNamesToRun, expectedLogOutput) {
  t.plan(1);
  const memoryLogger = makeMemoryLogger();
  jr.run(defsOrPath, jobNamesToRun, { makeLogger: memoryLogger.makeLogger })
    .then(() => {
      t.deepEqual(memoryLogger.output, expectedLogOutput);
      t.end();
    })
    .catch((err) => {
      t.fail(err);
    });
}

// load

test('load given no arguments should throw', (t) => {
  t.throws(() => jr.load(),
    /Error loading jobs file "undefined": AssertionError: missing path/);
  t.end();
});

test('load given empty string argument should throw', (t) => {
  t.throws(() => jr.load(''),
    /Error loading jobs file "": AssertionError: missing path/);
  t.end();
});

test.skip('load given empty file should throw', (t) => {
  const p = path.join(testFilesDir, 'empty.js');
  t.throws(() => jr.load(p),
    new RegExp(`Error loading jobs file "${p}": Error: Must export a function.`));
  t.end();
});

test('load given file with single job def should return valid job defs', (t) => {
  const p = path.join(testFilesDir, 'single-job.js');
  const jobDefs = jr.load(p);
  t.ok(jobDefs);
  expectDef(t, jobDefs.a, { action: true });
  t.end();
});

test('load given jobs file with multiple job defs should return valid job defs', (t) => {
  const p = path.join(testFilesDir, 'diamond.js');
  const jobDefs = jr.load(p);
  t.ok(jobDefs);
  expectDef(t, jobDefs.a, { action: true });
  expectDef(t, jobDefs.b, { needs: ['a'], action: true });
  expectDef(t, jobDefs.c, { needs: ['a'], action: true });
  expectDef(t, jobDefs.d, { needs: ['b', 'c'], action: true });
  expectDef(t, jobDefs.e, { needs: ['b'], action: true });
  t.end();
});

test.skip('load given jobs file with import should return valid job definitions', (t) => {
  const p = path.join(testFilesDir, 'print-config.js');
  const jobDefs = jr.load(p);
  t.ok(jobDefs);
  expectDef(t, jobDefs.config, { action: true });
  expectDef(t, jobDefs.printConfig, { needs: ['config'], action: true });
  t.end();
});

// run (job defs)

test('run given a single job and name of that job should run that job', (t) => {
  testRun(t, singleJob, ['a'], [
    { type: 'log', prefix: 'a', message: 'a' }
  ]);
});

test('run given multiple jobs and name of a job should run all needed jobs', (t) => {
  testRun(t, diamondJobs, ['d'], [
    { type: 'log', prefix: 'a', message: 'a' },
    { type: 'log', prefix: 'b', message: 'b' },
    { type: 'log', prefix: 'c', message: 'c' },
    { type: 'log', prefix: 'd', message: 'd' }
  ]);
});

test('run given multiple jobs and names of multiple job should run all needed jobs', (t) => {
  testRun(t, diamondJobs, ['d','e'], [
    { type: 'log', prefix: 'a', message: 'a' },
    { type: 'log', prefix: 'b', message: 'b' },
    { type: 'log', prefix: 'c', message: 'c' },
    { type: 'log', prefix: 'e', message: 'e' },
    { type: 'log', prefix: 'd', message: 'd' }
  ]);
});

test('run given a job name that returns a broken promise should return a broken promise', (t) => {
  t.plan(2);
  const error = 17;
  const jobDefs = {
    a: { action: () => Promise.reject(error) }
  };
  jr.run(jobDefs, ['a'])
    .catch((err) => {
      t.ok(err instanceof Error);
      t.equal(err.message, `Job "a" returned error: ${error}`);
      t.end();
    })
});

// run with child process functions

test('run given a job that uses commandAction runs the given command', (t) => {
  testRun(t, commandAction, ['run'], [
    { type: 'log', prefix: 'run', message: 'message' }
  ]);
});

test('run given a job that uses runCommandFn runs the given command', (t) => {
  testRun(t, runCommandFn, ['run'], [
    { type: 'log', prefix: 'run', message: 'message' }
  ]);
});

test('run given a job that uses processAction runs the given command', (t) => {
  testRun(t, processAction, ['run'], [
    { type: 'log', prefix: 'run', message: 'message' }
  ]);
});

test('run given a job that uses runProcessFn runs the given command', (t) => {
  testRun(t, runProcessFn, ['run'], [
    { type: 'log', prefix: 'run', message: 'message' }
  ]);
});

test('run given a job that uses scriptAction runs the given command', (t) => {
  testRun(t, scriptAction, ['run'], [
    { type: 'log', prefix: 'run', message: 'message' }
  ]);
});

test('run given a job that uses runScriptFn runs the given command', (t) => {
  testRun(t, runScriptFn, ['run'], [
    { type: 'log', prefix: 'run', message: 'message' }
  ]);
});

test('run given a job that uses a scriptAction to return an exit code of 0 succeeds', (t) => {
  testRun(t, scriptActionExitCode0, ['run'], [
  ]);
});

test('run given a job that uses a scriptAction to return an exit code of 1 fails', (t) => {
  t.plan(2);
  jr.run(scriptActionExitCode1, ['run'])
    .catch((err) => {
      t.ok(err instanceof Error);
      t.equal(err.message, `Job "run" returned error: 1`);
      t.end();
    })
});

// run (file path)

test('run given file with single job and name of that job should run that job', (t) => {
  testRun(t, path.join(testFilesDir, 'single-job.js'), ['a'], [
    { type: 'log', prefix: 'a', message: 'a' }
  ]);
});

test('run given file with multiple jobs and name of a job should run all needed jobs', (t) => {
  testRun(t, path.join(testFilesDir, 'diamond.js'), ['d'], [
    { type: 'log', prefix: 'a', message: 'a' },
    { type: 'log', prefix: 'b', message: 'b' },
    { type: 'log', prefix: 'c', message: 'c' },
    { type: 'log', prefix: 'd', message: 'd' }
  ]);
});

test('run given file with multiple jobs and names multiple jobs should run all needed jobs', (t) => {
  testRun(t, path.join(testFilesDir, 'diamond.js'), ['d','e'], [
    { type: 'log', prefix: 'a', message: 'a' },
    { type: 'log', prefix: 'b', message: 'b' },
    { type: 'log', prefix: 'c', message: 'c' },
    { type: 'log', prefix: 'e', message: 'e' },
    { type: 'log', prefix: 'd', message: 'd' }
  ]);
});

test.skip('run given file with import, with results, and name of a job should run all needed jobs', (t) => {
  testRun(t, path.join(testFilesDir, 'print-config.js'), ['printConfig'], [
    { type: 'log', prefix: 'printConfig', message: '12345' }
  ]);
});

test('run given a chain of jobs files that run each other should run all chained jobs', (t) => {
  testRun(t, path.join(testFilesDir, 'runChain1.js'), ['runChain1'], [
    { type: 'log', prefix: 'runChain3', message: 'runChain3 message' },
  ]);
});

test('run a jobs files that runs a job in another file with a run name should log that name', (t) => {
  testRun(t, path.join(testFilesDir, 'runSingleJobFromOtherFile.js'), ['runSingleJobFromOtherFile'], [
    { type: 'log', prefix: 'single-job:a', message: 'a' },
  ]);
});
