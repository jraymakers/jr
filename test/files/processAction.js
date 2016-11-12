module.exports = (jr) => ({
  run: { action: jr.processAction('echo',  ['message']) }
});
