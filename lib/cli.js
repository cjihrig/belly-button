'use strict';
const Path = require('path');
const Util = require('util');
const Bossy = require('bossy');
const Chalk = require('chalk');
const ESLint = require('eslint');
const Glob = require('glob');
const Insync = require('insync');
const CLIEngine = ESLint.CLIEngine;

const defaults = {
  configFile: Path.join(__dirname, '..', '.eslintrc.js'),
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


module.exports.run = function (argv, callback) {
  const args = Bossy.parse(cliArgs, {argv: argv});

  if (args instanceof Error) {
    return callback(new Error(Bossy.usage(cliArgs, args.message)));
  }

  const configFile = args.config;
  const globs = args.input;
  const ignore = args.ignore;
  const fix = args.fix;
  const cache = args.cache;
  const cwd = args.pwd || process.cwd();

  getFiles({
    globs: globs,
    ignore: ignore,
    cwd: cwd
  }, function (err, files) {
    if (err) {
      return callback(err);
    }

    lintFiles({
      configFile: configFile,
      fix: fix,
      cache: cache,
      files: files
    }, function (err, result) {
      if (err) {
        return callback(err);
      }

      formatResults(result, callback);
    });
  });
};


function formatResults (result, callback) {
  const totalWarnings = result.warningCount;
  const totalErrors = result.errorCount;
  const exitCode = +!!totalErrors;

  if (totalErrors < 1 && totalWarnings < 1) {
    return callback(null, Chalk.green.bold('\nClean as a whistle! No issues found!\n'), exitCode);
  }

  let output = '\n';
  const position = Chalk.gray.bold;
  const error = Chalk.red;
  const warning = Chalk.yellow;
  const colorCode = {
    2: error,
    1: warning
  };

  result.results.forEach(function (file) {
    if (file.errorCount < 1 && file.warningCount < 1) {
      return;
    }

    output += 'Problems in: ' + Chalk.dim(file.filePath) + '\n';

    file.messages.forEach(function (msg) {
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
  callback(null, output, exitCode);
}


function lintFiles (options, callback) {
  const fix = options.fix;
  const linter = new CLIEngine({
    configFile: options.configFile,
    useEslintrc: false,
    fix: fix,
    cache: options.cache
  });

  try {
    const result = linter.executeOnFiles(options.files);

    if (fix) {
      CLIEngine.outputFixes(result);
    }

    callback(null, result);
  } catch (err) {
    callback(err);
  }
}


function getFiles (options, callback) {
  const ignore = options.ignore;
  const cwd = options.cwd;
  let files = [];

  Insync.each(options.globs, function (pattern, next) {
    Glob(pattern, {
      realpath: true,
      ignore: ignore,
      cwd: cwd
    }, function (err, paths) {
      if (err) {
        return next(err);
      }

      files = files.concat(paths);
      next();
    });
  }, function (err) {
    callback(err, files);
  });
}
