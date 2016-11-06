module.exports = (jr) => ({
  config: jr.import('config.js', 'config'),
  printConfig: {
    needs: ['config'],
    action: (results, log) => log(results.config.buildId)
  }
});
