module.exports = (jr) => ({
  useLauncher: { action: (results, log) => jr.launcher('echo', ['message'])(log) }
});
