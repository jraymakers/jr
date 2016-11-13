module.exports = (jr) => ({
  test: { action: jr.commandAction('node ./test/test-jr.js | tap-dot --color') }
});