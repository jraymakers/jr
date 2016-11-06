# JR

A job runner with support for dependencies and parallelism.

### Installation

First, install [node.js](http://nodejs.org/download/).

Then, either install globally:

    npm install -g jr

Or locally:

    npm install jr

For command line use with a local installation, ensure node_modules/.bin is on your path.

### Usage

JR can be used either as a command line tool or as a library.

#### Command Line

```
> jr -h

  Usage: jr [options] <jobs>

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
    -l, --list     list jobs
    -t, --trace    log trace messages
```

When run from the command line, JR looks for a file in the current directory named "jobs.js".
This file should be a node module that exports a JR job definition function.
A JR job definition function takes one parameter, "jr", which has some utility functions,
and returns an object containing job definitions.
Each job defintion is an object with either of both of two properties:

"needs"
This is an array of strings.
Each string must be the name of another job in this set of job descriptions.
These indicate which other jobs are needed by this job, and thus must be run first.
The order of the needed jobs in the "needs" array is unimportant.

"action"
This is a function that defines what the job does.
It takes two arguments: "results" and "log".
The "results" argument contains the results returned by the "needed" jobs.
The keys of the "results" object are the names of the "needed" jobs.
The "log" argument is a function that the action can call to emit log messages.
The log messages will be prepended by the job name, to distinguish messages from jobs running in parallel.
The action function can return a Promise.  If it does, the job will not complete until the Promise is resolved or rejected.
If the action does not return a promise, then the job will be complete when the function returns.
The result of the action is either the return value or the value of the resolved Promise.
If an action function rejects a Promise, all further job execution will stop.

Here's an example:

```javascript
module.exports = (jr) => ({
  job1: {
    action: () => {
      return new Promise((resolve, reject) => {
        // Simulate some long running task.
        sleep(1);
        resolve('This is the result of job1.');
      });
    }
  },
  job2: {
    needs: ['job1'],
    action: (results, log) => {
      log('job1 results, in job2: ' + results.job1);
      return results.job1.toUpperCase();
    }
  },
  job3: {
    needs: ['job1'],
    action: (results, log) => {
      log('job1 results, in job3: ' + results.job1);
      return results.job1.toLowerCase();
    }
  },
  job4: {
    needs: ['job2', 'job3'],
    action: (results, log) => {
      log('job2 results, in job4: ' + results.job2);
      log('job3 results, in job4: ' + results.job3);
      // A job action need not return a result.
    }
  },
  job5: {
    action: () => {
      // ...
    }
  }
});
```

Then, run (for example):

    jr job4

to run job4 and all the jobs it depends on.

In this case, job1 will be run, followed by job2 and job3 in parallel, and then job4.  Job5 will not be run.

#### Library

JR can also be used from node:

```javascript
var jr = require('jr');

var jobs = {
  config: {
    action: () => ({
      // config goes here
    })
  },
  data: {
    needs: ['config'],
    action: (results) => {
      // get some data
    }
  },
  outDir: {
    needs: ['config'],
    action: (results) => {}
      // setup output directory
    }
  },
  outFile: {
    needs: ['config', 'data', 'outDir'],
    action: (results) => {
      // write data to output file in output directory
    }
  },
  emailLink: {
    needs: ['config', 'outFile'],
    action: (results) => {
      // send email containing link to output file
    }
  }
};

jr.runJobs(jobs, ['emailLink'])
  .then(() => {
    console.log('success!');
  })
  .catch((err) => {
    console.log(err);
  });
```

Instead of a 'jobs' object, a path to a jobs file can be given:

```javascript
var jr = require('jr');

jr.runJobsFromFile('./scripts/build.js', ['build'])
  .then(() => {
    console.log('success!');
  })
  .catch((err) => {
    console.log(err);
  });
```
