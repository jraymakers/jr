const path = require('path');

module.exports = (jr) => ({
  run: { action: jr.scriptAction(path.join(__dirname, 'exitCode'),  ['0']) }
});
