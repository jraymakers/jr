module.exports = (jr) => ({
  run: { action: (j) => jr.runCommandFn('echo message')(j.logger) }
});
