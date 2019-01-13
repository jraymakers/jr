module.exports = (jr) => ({
  config: jr.import('config.js', 'config'),
  printConfig: {
    needs: ['config'],
    action: (j) => j.logger.log(j.results.config.buildId)
  }
});
