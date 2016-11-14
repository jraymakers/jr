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
- Parallelism: Using node-native [child processes](https://nodejs.org/api/child_process.html).

**Note: Version 0.5 is a complete redesign and rewrite from the previous version, 0.2.3.**

**Many things have changed.  If you depend on the old version, upgrading will require some work.**

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

jr.run(jobs, ['displayAll'])
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

### JR Argument API

The `jr` argument to the jobs definition function contains the following helper functions:

- `run`

    This is used to run jobs from other jobs definintion.

    Just like the `run` function on the top-level API (below),
    it can be given either a path to a jobs file or a jobs definition object.

    (Giving a path is the intended use case, although there may be reasons to perform a nested run.)

    ```javascript
    module.exports = (jr) => ({
      runJobsFromOtherFile: {
        action: () => jr.run('otherJobsFile.js', ['jobToRun', 'otherJobToRun'])
      }
    });
    ```

- `commandAction`

- `processAction`

- `scriptAction`

    These three functions are used to launch child processes.

    They each return an action function and automatically pipe the output of the child process to the job's logger.

    The three functions differ slightly in how they work and the arguments they take:

    - `commandAction` uses the
    [Node.js exec](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback) function
    and takes the same arguments.  It is best for running shell commands.
    - `processAction` uses the
    [Node.js spawn](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options) function
    and takes the same arguments.  It is best for running executables that are not Node scripts.
    - `scriptAction` uses the
    [Node.js fork](https://nodejs.org/api/child_process.html#child_process_child_process_fork_modulepath_args_options) function
    and takes the same arguments.  It is best for running Node scripts.

    ```javascript
    const path = require('path');
    module.exports = (jr) => ({
      // commandAction, like exec, takes a single string argument (and optional options):
      runCommand: { action: jr.commandAction('echo message') },

      // processAction, like spawn, takes the command and arguments separately: 
      runProcess: { action: jr.processAction('echo', ['message']) },

      // scriptAction is like processAction, but only supports Node scripts (like fork).
      // This assumes an echo.js script is in the same directory:
      runScript: { action: jr.scriptAction(path.join(__dirname, 'echo'), ['message']) }
    });
    ```

- `runCommandFn`

- `runProcessFn`

- `runScriptFn`

    These three are counterparts to the above,
    but allow actions to use the underlying function that launches the child process
    rather than the wrappers that create an action function.

    Each of these functions creates and returns a function that,
    when passed a logger like the one on the `j` argument to an action function,
    launches the child process and returns a Promise for the result.

    They are slightly more verbose to use, but allow for more complex use cases,
    such as using the results passed into the action function to control how the child process is launched.

    ```javascript
    const path = require('path');
    module.exports = (jr) => ({
      runCommand: { action: (j) => jr.runCommandFn('echo message')(j.logger) },

      runProcess: { action: (j) => jr.runProcessFn('echo', ['message'])(j.logger) },

      runScript: {
        action: (j) => jr.scriptAction(path.join(__dirname, 'echo'), ['message'])(j.logger)
      }
    });
    ```

### Top Level API

These functions are exported by `jr`.

- `run`

    Given a set of job definitions (or a path to a job definitions file) and a list of job names, run all needed jobs.

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

    jr.run(jobs, ['displayAll'])
      .then(() => {
        console.log('success!');
      })
      .catch((err) => {
        console.log(err);
      });
    ```

    Instead of a set of job definitions, `run` can be given a path to a jobs definition file:

    ```javascript
    const jr = require('jr');

    jr.run('./jobs.js', ['displayAll'])
      .then(() => {
        console.log('success!');
      })
      .catch((err) => {
        console.log(err);
      });
    ```

- `load`

    This loads job definitions from the given file.  It is used by `run` when given a path.

    The resulting job definitions is suitable for passing to `run`.
    
    Note that it runs synchronously.  It uses [Node.js require](https://nodejs.org/api/globals.html#globals_require) under the covers.

    ```javascript
    const jr = require('jr');
    const jobDefs = jr.load('./jobs.js');
    for (let jobName in jobDefs) {
      console.log(jobName);
    }
    ```

- `commandAction`

- `processAction`

- `scriptAction`

- `runCommandFn`

- `runProcessFn`

- `runScriptFn`

    These six functions are identical to the ones on the `jr` argument to the jobs definition function, described above.

    They are exported by the `jr` library for convenience, for defining jobs outside of a jobs file.

- `makeLogger`

    This function, when given a string prefix, returns a logger object like the one on the `j` argument to action functions.

    It is exported by `jr` for convenience.

    ```javascript
    const logger = jr.makeLogger('customPrefix');
    logger.log('my message');
    ```

    Output:
    ```
    [customPrefix] my message
    ```
