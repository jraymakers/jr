const chalk = require('chalk');
const stripAnsi = require('strip-ansi');

function maybeStripColor(s) {
  return chalk.supportsColor ? s : stripAnsi(s);
}

function maybeColor(colorFn, s) {
  if (chalk.supportsColor) {
    return colorFn(s);
  }
  return s;
}

function output(prefix, message) {
  const line = maybeStripColor(`${prefix} ${message}`);
  console.log(line);
}

function outputError(prefix, message) {
  output(maybeColor(chalk.red, `[${prefix}]`), message);
}

function outputLog(prefix, message) {
  output(maybeColor(chalk.grey, `[${prefix}]`), message);
}

function outputWarn(prefix, message) {
  output(maybeColor(chalk.yellow,`[${prefix}]`), message);
}

function makeLogger(prefix) {
  const error = (message) => outputError(prefix, message);
  const log = (message) => outputLog(prefix, message);
  const warn = (message) => outputWarn(prefix, message);
  return {
    error: error,
    info: log,
    log: log,
    warn: warn
  };
}

module.exports = makeLogger;
