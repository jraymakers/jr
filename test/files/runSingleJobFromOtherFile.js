const path = require('path');
module.exports = (jr) => ({
  runSingleJobFromOtherFile: {
    action: (j) => jr.run(path.join(__dirname, 'single-job'), ['a'], {
      runName: 'single-job'
    })
  }
});
