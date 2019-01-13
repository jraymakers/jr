const child_process = require('child_process');
const path = require('path');

const exec = child_process.exec;
const fork = child_process.fork;
const spawn = child_process.spawn;

const pathSeparator = process.platform === 'win32' ? ';' : ':';
const nodeModulesBinPath = path.join('node_modules', '.bin');

function logLines(data, log) {
  data.toString().split(/\r\n|\n|\r/).forEach((line) => {
    if (line) {
      log(line);
    }
  });
}

function buildEnv(options) {
  options = options || {};
  options.env = options.env || Object.assign({}, process.env);
  options.env.PATH = options.env.PATH || process.env.PATH;
  if (options.env.PATH) {
    options.env.PATH = [nodeModulesBinPath, options.env.PATH].join(pathSeparator);
  } else {
    options.env.PATH = nodeModulesBinPath;
  }
  return options;
}

function runCommandFn(command, options) {
  return (logger) => new Promise((resolve, reject) => {
    exec(command, buildEnv(options), (error, stdout, stderr) => {
      logLines(stdout, logger.log);
      logLines(stderr, logger.error);
      if (error) {
        reject(error.code);
      } else {
        resolve();
      }
    });
  });
}

function runChildProcess(startFn) {
  return (logger) => new Promise((resolve, reject) => {
    const child = startFn();
    if (child) {
      if (child.stdout) {
        child.stdout.on('data', (data) => logLines(data, logger.log));
      }
      if (child.stderr) {
        child.stderr.on('data', (data) => logLines(data, logger.error));
      }
      child.on('exit', (code) => {
        if (code) {
          reject(code);
        } else {
          resolve();
        }
      });
    } else {
      reject(new Error(`Failed to start child process.`));
    }
  });
}

function runProcessFn(command, args, options) {
  return runChildProcess(() => spawn(command, args, buildEnv(options)));
}

function runScriptFn(scriptPath, args, options) {
  return runChildProcess(() => fork(scriptPath, args, Object.assign(buildEnv(options), { silent: true })));
}

function commandAction(command, args, options) {
  return (j) => runCommandFn(command, args, options)(j.logger);
}

function processAction(command, args, options) {
  return (j) => runProcessFn(command, args, options)(j.logger);
}

function scriptAction(scriptPath, args, options) {
  return (j) => runScriptFn(scriptPath, args, options)(j.logger);
}

module.exports = {
  commandAction: commandAction,
  processAction: processAction,
  scriptAction: scriptAction,
  runCommandFn: runCommandFn,
  runProcessFn: runProcessFn,
  runScriptFn: runScriptFn
};
