module.exports = (jr) => ({
  runMultipleJobsFromOtherFile: { action: (j) => jr.run('./diamond', ['b', 'c']) }
});
