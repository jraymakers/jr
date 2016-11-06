const jr = require('../');
const path = require('path');
const test = require('tape');

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
  expectDef(t, jobDefs.d, { needs: ['b', 'c'] });
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

test('runJobsFromFile given file with single job and name of that job should run that job', (t) => {
  t.plan(1);
  const p = path.join(__dirname, 'files', 'single-job.js');
  jr.runJobsFromFile(p, ['a'])
    .then(() => {
      t.ok(true);
      t.end();
    });
});

test('runJobsFromFile given file with multiple jobs and name of a job should run all needed jobs', (t) => {
  t.plan(1);
  const p = path.join(__dirname, 'files', 'diamond.js');
  jr.runJobsFromFile(p, ['d'])
    .then(() => {
      t.ok(true);
      t.end();
    });
});

test('runJobsFromFile given file with multiple jobs and names multiple jobs should run all needed jobs', (t) => {
  t.plan(1);
  const p = path.join(__dirname, 'files', 'diamond.js');
  jr.runJobsFromFile(p, ['d', 'e'])
    .then(() => {
      t.ok(true);
      t.end();
    });
});
