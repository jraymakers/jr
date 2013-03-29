var _ = require('underscore');
var async = require('async');
var fs = require('fs');
var path = require('path');

function noop(cb) {
  cb();
}

function makeAsyncTasks(jobNames, jobs) {
  var asyncTasks = {};
  var queue = jobNames.length > 0 ? jobNames.slice(0) : [];
  while (queue.length > 0) {
    var jobName = queue.shift();
    if (!asyncTasks[jobName]) {
      var job = jobs[jobName];
      if (!job) {
        return { error: new Error('Job "' + jobName + '" was not found.') };
      }
      var action = job.action;
      if (action) {
        if (!_.isFunction(action)) {
          return { error: new Error('Job "' + jobName + '" has an "action" parameter that is not a function.') };
        }
      } else {
        action = noop;
      } 
      var needs = job.needs;
      if (needs) {
        if (!Array.isArray(needs)) {
          return { error: new Error('Job "' + jobName + '" has a "needs" parameter that is not an array.') };
        }
        queue = queue.concat(needs);
        asyncTasks[jobName] = needs.concat(action);
      } else {
        asyncTasks[jobName] = action;
      }
    }
  }
  return { tasks: asyncTasks };
}

function runJobsFromObj(jobNames, jobs, cb) {
  var result = makeAsyncTasks(jobNames, jobs);
  if (result.tasks) {
    async.auto(result.tasks, cb);
  } else {
    cb(result.error);
  }
}

function loadJobsFile(opts, cb) {
  var jobsFile = opts.jobsFile || path.join(process.cwd(), 'jobs.js');
  fs.exists(jobsFile, function (exists) {
    if (exists) {
      try {
        var jobs = require(jobsFile);
        cb(null, jobs);
      } catch (ex) {
        cb(new Error('Jobs file "' + jobsFile + '" could not be loaded: ' + ex));
      }
    } else {
      cb(new Error('Jobs file "' + jobsFile + '" was not found.'));
    }
  });
}

function runJobsFromFile(jobNames, jobsFile, cb) {
  loadJobsFile({
    jobsFile: jobsFile
  }, function (err, jobs) {
    if (err) {
      cb(err);
    } else {
      runJobsFromObj(jobNames, jobs, cb);
    }
  });
}

function runJobs(opts, cb) {
  var jobNames = opts.jobNames || [];
  var jobs = opts.jobs;
  if (!jobs) {
    runJobsFromFile(jobNames, opts.jobsFile, cb);
  } else {
    runJobsFromObj(jobNames, jobs, cb);
  }
}

module.exports = {
  load: loadJobsFile,
  run: runJobs
};