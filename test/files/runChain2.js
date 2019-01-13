const path = require('path');

module.exports = (jr) => ({
  runChain2: { action: (j) => jr.run(path.join(__dirname, 'runChain3'), ['runChain3']) }
});
