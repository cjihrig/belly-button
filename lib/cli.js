'use strict';
const Path = require('path');
const Util = require('util');
const Bossy = require('@hapi/bossy');
const Chalk = require('chalk');
const { CLIEngine } = require('eslint');
const Glob = require('glob');
const Insync = require('insync');
const getFilesToLint = Util.promisify(getFiles);

const defaults = {
  configFile: Path.resolve(__dirname, '..', '.eslintrc.js'),
  globs: ['**/*.js'],
  ignore: ['node_modules/**']
};

const cliArgs = {
  'c': {
    description: 'File path to .eslintrc.js file',
    alias: 'config',
    type: 'string',
    require: false,
    multiple: false,
    default: defaults.configFile
  },
  'i': {
    description: 'Input glob to lint',
    alias: 'input',
    type: 'string',
    require: false,
    multiple: true,
    default: defaults.globs
  },
  'I': {
    description: 'Input globs to ignore',
    alias: 'ignore',
    type: 'string',
    require: false,
    multiple: true,
    default: defaults.ignore
  },
  'f': {
    description: 'Fix linting problems when possible',
    alias: 'fix',
    type: 'boolean',
    require: false,
    multiple: false,
    default: false
  },
  'C': {
    description: 'Enable lint caching',
    alias: 'cache',
    type: 'boolean',
    require: false,
    multiple: false,
    default: true
  },
  'w': {
    description: 'Working directory',
    alias: 'pwd',
    type: 'string',
    require: false,
    multiple: false
  }
};


module.exports.run = async function (argv, callback) {
  const args = Bossy.parse(cliArgs, { argv });

  if (args instanceof Error) {
    return callback(new Error(Bossy.usage(cliArgs, args.message)));
  }

  const configFile = args.config;
  const globs = args.input;
  const ignore = args.ignore;
  const fix = args.fix;
  const cache = args.cache;
  const cwd = args.pwd || process.cwd();

  try {
    const files = await getFilesToLint({ globs, ignore, cwd });
    const result = lintFiles({ configFile, fix, cache, files });
    const exitCode = +!!result.errorCount;
    const output = formatResults(result);

    callback(null, output, exitCode);
  } catch (err) {
    callback(err);
  }
};


function formatResults (result) {
  const totalWarnings = result.warningCount;
  const totalErrors = result.errorCount;
  const totalIssues = totalWarnings + totalErrors;

  if (totalIssues < 1) {
    return Chalk.green.bold('\nClean as a whistle! No issues found!\n');
  }

  let output = '\n';
  const position = Chalk.gray.bold;
  const error = Chalk.red;
  const warning = Chalk.yellow;
  const colorCode = {
    2: error,
    1: warning
  };

  result.results.forEach((file) => {
    if (file.errorCount < 1 && file.warningCount < 1) {
      return;
    }

    output += 'Problems in: ' + Chalk.dim(file.filePath) + '\n';

    file.messages.forEach((msg) => {
      const mainStyle = colorCode[msg.severity] || Chalk.gray;

      output += mainStyle('\t' + msg.message.slice(0, -1) +
      ' at line ' + position(Util.format('[%s]', msg.line)) +
      ', column ' + position(Util.format('[%s]', msg.column)));
      output += ' - ' + Chalk.blue(Util.format('(%s)', msg.ruleId));
      output += '\n';
    });

    output += '\n';
  });

  output += Chalk.bold('Results\n');
  output += 'Total ' + error.bold('errors') + ': ' + totalErrors + '\n';
  output += 'Total ' + warning.bold('warnings') + ': ' + totalWarnings;
  output += '\n';
  return output;
}


function lintFiles (options) {
  const fix = options.fix;
  const linter = new CLIEngine({
    configFile: options.configFile,
    useEslintrc: false,
    fix,
    cache: options.cache
  });

  const result = linter.executeOnFiles(options.files);

  if (fix) {
    CLIEngine.outputFixes(result);
  }

  return result;
}


function getFiles (options, callback) {
  let files = [];
  const globOptions = {
    realpath: true,
    ignore: options.ignore,
    cwd: options.cwd
  };

  Insync.each(options.globs, (pattern, next) => {
    Glob(pattern, globOptions, (err, paths) => {
      if (err) {
        return next(err);
      }

      files = files.concat(paths);
      next();
    });
  }, (err) => {
    callback(err, files);
  });
}
