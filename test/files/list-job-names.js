const jr = require('../../');
const path = require('path');
const jobDefs = jr.loadJobsFromFile(path.join(__dirname, '..', '..', 'jobs.js'));
for (let jobName in jobDefs) {
  console.log(jobName);
}
