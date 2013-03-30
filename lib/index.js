var _ = require('underscore');
var async = require('async');
var fs = require('fs');
var path = require('path');

function noop(cb) {
  cb();
}

function wrapAction(action, jobName, beforeJob, afterJob) {
  if (beforeJob || afterJob) {
    return function (cb, results) {
      async.series([
        function (innerCb) {
          if (beforeJob) { beforeJob(innerCb, jobName); }
        },
        function (innerCb) {
          action(innerCb, results);
        },
        function (innerCb) {
          if (afterJob) { afterJob(innerCb, jobName); }
        }
      ], function (err, innerResults) {
        cb(err, innerResults[1]);
      });
    }
  } else {
    return action; 
  }
}

function makeAsyncTasks(opts) {
  var asyncTasks = {};
  var queue = opts.jobNames.length > 0 ? opts.jobNames.slice(0) : [];
  while (queue.length > 0) {
    var jobName = queue.shift();
    if (!asyncTasks[jobName]) {
      var job = opts.jobs[jobName];
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
      var task = wrapAction(action, jobName, opts.beforeJob, opts.afterJob);
      var needs = job.needs;
      if (needs) {
        if (!_.isArray(needs)) {
          return { error: new Error('Job "' + jobName + '" has a "needs" parameter that is not an array.') };
        }
        queue = queue.concat(needs);
        asyncTasks[jobName] = needs.concat(task);
      } else {
        asyncTasks[jobName] = task;
      }
    }
  }
  return { tasks: asyncTasks };
}

function runJobsFromObj(opts, cb) {
  var result = makeAsyncTasks(opts);
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
        cb(null, {
          jobs: jobs,
          jobsFile: jobsFile
        });
      } catch (err) {
        cb(new Error('Jobs file "' + jobsFile + '" could not be loaded: ' + err));
      }
    } else {
      cb(new Error('Jobs file "' + jobsFile + '" was not found.'));
    }
  });
}

function runJobsFromFile(opts, cb) {
  loadJobsFile({
    jobsFile: opts.jobsFile
  }, function (err, result) {
    if (err) {
      cb(err);
    } else {
      runJobsFromObj(_.extend(_.clone(opts), result), cb);
    }
  });
}

function ensureArray(val, def) {
  return _.isArray(val) ? val : def;
}

function ensureFunction(val, def) {
  return _.isFunction(val) ? val : def;
}

function ensureObject(val, def) {
  return _.isObject(val) ? val : def;
}

function ensureString(val, def) {
  return _.isString(val) ? val : def;
}

function runJobs(inOpts, cb) {
  var opts = {
    jobNames: ensureArray(inOpts.jobNames, []),
    jobs: ensureObject(inOpts.jobs),
    jobsFile: ensureString(inOpts.jobsFile),
    beforeJob: ensureFunction(inOpts.beforeJob),
    afterJob: ensureFunction(inOpts.afterJob)
  };
  if (opts.jobs) {
    runJobsFromObj(opts, cb);
  } else {
    runJobsFromFile(opts, cb);
  }
}

module.exports = {
  load: loadJobsFile,
  run: runJobs
};