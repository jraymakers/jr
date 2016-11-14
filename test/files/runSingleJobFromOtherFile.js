module.exports = (jr) => ({
  runSingleJobFromOtherFile: { action: (j) => jr.run('./single-job', ['a']) }
});
