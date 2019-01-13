const chalk = require('chalk');

function maybeStripColor(s) {
  return chalk.supportsColor ? s : chalk.stripColor(s);
}

function output(prefix, message) {
  const line = maybeStripColor(`${prefix} ${message}`);
  console.log(line);
}

function outputError(prefix, message) {
  output(chalk.red(`[${prefix}]`), message);
}

function outputLog(prefix, message) {
  output(chalk.grey(`[${prefix}]`), message);
}

function outputWarn(prefix, message) {
  output(chalk.yellow(`[${prefix}]`), message);
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
