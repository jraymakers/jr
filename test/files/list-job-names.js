const jr = require('../../');
const path = require('path');
const jobDefs = jr.load(path.join(__dirname, '..', '..', 'jobs.js'));
for (let jobName in jobDefs) {
  console.log(jobName);
}
