module.exports = (jr) => ({
  runMultipleJobsFromOtherFile: { action: (j) => jr.runJobsFromFile('./diamond', ['b', 'c']) }
});
