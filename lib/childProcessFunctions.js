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
  options.env = options.env || {};
  options.env.PATH = options.env.PATH || process.env.PATH;
  if (options.env.PATH) {
    options.env.PATH = [nodeModulesBinPath, options.env.PATH].join(pathSeparator);
  } else {
    options.env.PATH = nodeModulesBinPath;
  }
  return options;
}

function runCommandFn(command, options) {
  return (log) => new Promise((resolve, reject) => {
    exec(command, buildEnv(options), (error, stdout, stderr) => {
      logLines(stdout, log);
      logLines(stderr, log);
      if (error) {
        reject(error.code);
      } else {
        resolve();
      }
    });
  });
}

function runChildProcess(startFn) {
  return (log) => new Promise((resolve, reject) => {
    const child = startFn();
    child.stdout.on('data', (data) => logLines(data, log));
    child.stderr.on('data', (data) => logLines(data, log));
    child.on('exit', (code) => {
      if (code) {
        reject(code);
      } else {
        resolve();
      }
    });
  });
}

function runProcessFn(command, args, options) {
  return runChildProcess(() => spawn(command, args, buildEnv(options)));
}

function runScriptFn(scriptPath, args, options) {
  return runChildProcess(() => fork(scriptPath, args, Object.assign(buildEnv(options), { silent: true })));
}

function commandAction(command, args, options) {
  return (results, log) => runCommandFn(command, args, options)(log);
}

function processAction(command, args, options) {
  return (results, log) => runProcessFn(command, args, options)(log);
}

function scriptAction(scriptPath, args, options) {
  return (results, log) => runScriptFn(scriptPath, args, options)(log);
}

module.exports = {
  commandAction: commandAction,
  processAction: processAction,
  scriptAction: scriptAction,
  runCommandFn: runCommandFn,
  runProcessFn: runProcessFn,
  runScriptFn: runScriptFn
};
