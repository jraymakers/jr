const path = require('path');

module.exports = (jr) => ({
  runChain1: { action: (j) => jr.run(path.join(__dirname, 'runChain2'), ['runChain2']) }
});
