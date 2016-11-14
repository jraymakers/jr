module.exports = (jr) => ({
  runSingleJobFromOtherFile: { action: (j) => jr.runJobsFromFile('./single-job', ['a']) }
});
