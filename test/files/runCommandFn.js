module.exports = (jr) => ({
  run: { action: (results, log) => jr.runCommandFn('echo message')(log) }
});
