module.exports = (jr) => ({
  test: { action: jr.launch('node', ['./test/test-jr.js']) }
});