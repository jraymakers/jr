# JR

A lightweight job runner with support for dependencies, concurrency, and parallelism.

Features:
- Simple: Jobs are defined in JavaScript.
- Convenient: Helper functions support common patterns.
- Flexible: Use on the command line or as a library.
- Fast: Very little overhead = runs fast.
- Lightweight: Very few dependencies = easy to install and maintain.

Support for:
- Dependencies: Jobs can depend on other jobs, which are automatically run when needed.
- Concurency: Using node-native [Promise API](https://promisesaplus.com/).
- Paralleism: Using node-native [child processes](https://nodejs.org/api/child_process.html).

## Examples

### Command Line Usage

Contents of `jobs.js`:
```javascript
module.exports = () => ({
  numbers: {
    action: () => ({
      x: 3,
      y: 5
    })
  },
  calculateSum: {
    needs: ['numbers'],
    action: (j) => j.results.numbers.x + j.results.numbers.y
  },
  calculateProduct: {
    needs: ['numbers'],
    action: (j) => j.results.numbers.x * j.results.numbers.y
  },
  displaySum: {
    needs: ['calculateSum'],
    action: (j) => {
      j.logger.log(j.results.calculateSum);
    }
  },
  displayProduct: {
    needs: ['calculateProduct'],
    action: (j) => {
      j.logger.log(j.results.calculateProduct);
    }
  },
  displayAll: {
    needs: ['displaySum', 'displayProduct']
  }
});
```

In the same directory as `jobs.js`:
```
jr displayAll
```

Output:
```
[displaySum] 8
[displayProduct] 15
[jr] Done after 32 ms
```

### Library API Usage

```javascript
const jr = require('jr');

const jobs = {
  numbers: {
    action: () => ({
      x: 3,
      y: 5
    })
  },
  calculateSum: {
    needs: ['numbers'],
    action: (j) => j.results.numbers.x + j.results.numbers.y
  },
  calculateProduct: {
    needs: ['numbers'],
    action: (j) => j.results.numbers.x * j.results.numbers.y
  },
  displaySum: {
    needs: ['calculateSum'],
    action: (j) => {
      j.logger.log(j.results.calculateSum);
    }
  },
  displayProduct: {
    needs: ['calculateProduct'],
    action: (j) => {
      j.logger.log(j.results.calculateProduct);
    }
  },
  displayAll: {
    needs: ['displaySum', 'displayProduct']
  }
};

jr.runJobs(jobs, ['displayAll'])
  .then(() => {
    console.log('success!');
  })
  .catch((err) => {
    console.log(err);
  });
```

Output:
```
[displaySum] 8
[displayProduct] 15
success!
```

## Details

### Installation

First, install [Node.js](https://nodejs.org).

Then, either install globally:

    npm install -g jr

Or locally:

    npm install jr

For command line use with a local installation, ensure `node_modules/.bin` is on your path.

### Jobs File

A jobs file is a JavaScript file containing a node module that exports a jobs definition function.

A jobs definition function take a single argument, commonly named `jr`,
and returns an object containing a map of job names to job definitions.

Using modern syntax, this can be written:

```javascript
module.exports = (jr) => ({
  jobA: {
    // ...
  },
  jobB: {
    // ...
  }
});
```

The `jr` argument contains the following helper functions:

- `import`

    This is used to include jobs from other jobs definintion files in this one.

    ```javascript
    module.exports = (jr) => ({
      importedJob: jr.import('otherJobsFile.js', 'jobToImport')
    });
    ```

    Note that `import` returns a job definition object,
    which is given a local job name that can be different from the imported job.

    **TODO** What about jobs needed by the imported job?

- `commandAction`

- `processAction`

- `scriptAction`

- `runCommandFn`

- `runProcessFn`

- `runScriptFn`

### Job Definitions

Each job definition is an object with two properties, both of which are optional.

(An empty job definition is legal but boring.)

```javascript
jobA: {
  // The "action" property is a function that defines what the job does.
  // It takes a single argument, commonly called "j", described below.
  // The action function can return a value or a Promise.
  // The resulting value is available to jobs that "need" it (see below).
  action: (j) => {
    // ...
  },
  // The "needs" property is an array of job names that must run before this job.
  // The job name must appear elsewhere in this set of job definitions.
  // The order of the job names in this array is unimportant.
  // The results of these jobs are available to the action through "j.results".
  needs: ['jobB', 'jobC']
}
```

### Job Action Argument API

The argument to job action functions (commonly named `j` for "job") has the following properties:

- `logger`

    This object contains several functions used for logging:

    - `log`
    - `info` (synonym for `log`)
    - `warn`
    - `error`

    All take a string and display it to the console, prefixing it with the currently running job's name.

    If console colors are supported, `warn` and `error` use them.

- `results`

    For each job that this job "needs", a property is added to the `results` object.

    The value of each property is the result returned by that job.

    If a job returns a Promise, the result is the resolved value of that Promise.

### Command Line Options

```
> jr -h

  Usage: jr [options] <jobs ...>

  Options:

    -h, --help         output usage information
    -V, --version      output the version number
    -f, --file [path]  jobs file
    -l, --list         list jobs
    -t, --trace        log trace messages
```

When run from the command line, `jr` looks for a jobs definition file in the current directory named `jobs.js`.

The `--file` option can be used to override this and load a different jobs definition file.

The `--list` option displays all jobs and their needs.

The `--trace` option outputs additional log messages when each job starts and stops, including timing information.

### Top Level API

These functions are exported by `jr`.

- `runJobs`

    Given a set of job definitions and a list of job names, run all needed jobs.

    If the given jobs shared needs, those needs will only be run once.

    Returns a promise that is resolved when all jobs are done, or rejected when any fail.

    ```javascript
    const jr = require('jr');

    const jobs = {
      numbers: {
        action: () => ({
          x: 3,
          y: 5
        })
      },
      calculateSum: {
        needs: ['numbers'],
        action: (j) => j.results.numbers.x + j.results.numbers.y
      },
      calculateProduct: {
        needs: ['numbers'],
        action: (j) => j.results.numbers.x * j.results.numbers.y
      },
      displaySum: {
        needs: ['calculateSum'],
        action: (j) => {
          j.logger.log(j.results.calculateSum);
        }
      },
      displayProduct: {
        needs: ['calculateProduct'],
        action: (j) => {
          j.logger.log(j.results.calculateProduct);
        }
      },
      displayAll: {
        needs: ['displaySum', 'displayProduct']
      }
    };

    jr.runJobs(jobs, ['displayAll'])
      .then(() => {
        console.log('success!');
      })
      .catch((err) => {
        console.log(err);
      });
    ```

- `runJobsFromFile`

    Just like `runJobs`, but takes a path to a jobs definition file instead of the set of job definitions themselves.

    ```javascript
    const jr = require('jr');

    jr.runJobsFromFile('./jobs.js', ['displayAll'])
      .then(() => {
        console.log('success!');
      })
      .catch((err) => {
        console.log(err);
      });
    ```

- `loadJobsFromFile`

- `commandAction`

- `processAction`

- `scriptAction`

- `runCommandFn`

- `runProcessFn`

- `runScriptFn`

- `makeLogger`
