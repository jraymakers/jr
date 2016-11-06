module.exports = (jr) => ({
  config: jr.import('config.js', 'config'),
  printConfig: {
    needs: ['config'],
    action: (results) => jr.log(results.config)
  }
});
