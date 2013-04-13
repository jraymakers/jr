# JR

A node.js-based job runner with support for asynchrony and dependencies.

### Installation

First, install [node.js](http://nodejs.org/download/).

Then, either install globally:

    npm install -g jr

Or locally:

    npm install jr

For command line use with a local installation, ensure node_modules/.bin is on your path.

JR is powered by the excellent [async](https://github.com/caolan/async) library.  Job descriptions follow the conventions of [async.auto](https://github.com/caolan/async#auto).

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

On the command line, JR reads a jobs.js file from the current directory, which is just a node module exporting a set of jobs:

```javascript
module.exports = {
  job1: {
    action: function (callback) {
      // call callback(null, results) or callback(error) when done
    }
  },
  job2: {
    needs: ['job1'],
    action: function (callback, results) {
      // results.job1 contains the results from job1
    }
  },
  job3: {
    needs: ['job1'],
    action: function (callback, results) {
      // though needed by two jobs, job1 is only run once
      // job2 and job3 may run in parallel
    }
  },
  job4: {
    needs: ['job2', 'job3'],
    action: function (callback, results) {
       // results contains the results of job1, job2, and job3
    }
  },
  job5: {
    action: function (callback) {
       // not all jobs need to be connected
    }
  }
};
```

Then, run (for example):

    jr job4

to run job4 and all the jobs it depends on.

In this case, job1 will be run, followed by job2 and job3 in parallel, and then job4.  Job5 will not be run.

#### Library

JR can also be used from within node:

```javascript
var jr = require('jr');

var jobs = {
  config: {
    action: function (callback) {
      callback(null, {
        // config goes here
      });
    }
  },
  data: {
    needs: ['config'],
    action: function (callback, results) {
      // get some data
    }
  },
  outDir: {
    needs: ['config'],
    action: function (callback, results) {
      // setup output directory
    }
  },
  outFile: {
    needs: ['config', 'data', 'outDir'],
    action: function (callback, results) {
      // write data to output file in output directory
    }
  },
  emailLink: {
    needs: ['config', 'outFile'],
    action: function (callback, results) {
      // send email containing link to output file
    }
  }
};

jr.run({
  jobNames: ['emailLink'],
  jobs: jobs
}, function (err) {
  if (err) {
    console.log(err);
  }
});
```

Instead of a 'jobs' object, a path to a jobs file can be given:

```javascript
var jr = require('jr');

jr.run({
  jobNames: ['build'],
  jobsFile: 'scripts/build.js'
}, function (err) {
  if (err) {
    console.log(err);
  } else {
    console.log('success');
  }
});
```