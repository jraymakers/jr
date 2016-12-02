module.exports = (jr) => ({
  test: { action: jr.commandAction('node ./test/test-jr.js | tap-dot --color') },
  fail: { action: () => Promise.reject('intentional rejection') },
  testAndFail: { needs: ['test', 'fail'] }
});