'use strict';
var Path = require('path');
var Util = require('util');
var Bossy = require('bossy');
var Chalk = require('chalk');
var ESLint = require('eslint');
var Glob = require('glob');
var Insync = require('insync');
var CLIEngine = ESLint.CLIEngine;

var defaults = {
  configFile: Path.join(__dirname, '..', '.eslintrc.js'),
  globs: ['**/*.js'],
  ignore: ['node_modules/**']
};
var cliArgs = {
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
  var args = Bossy.parse(cliArgs, {argv: argv});

  if (args instanceof Error) {
    return callback(new Error(Bossy.usage(cliArgs, args.message)));
  }

  var configFile = args.config;
  var globs = args.input;
  var ignore = args.ignore;
  var fix = args.fix;
  var cache = args.cache;
  var cwd = args.pwd || process.cwd();

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
  var totalWarnings = result.warningCount;
  var totalErrors = result.errorCount;
  var exitCode = +!!totalErrors;

  if (totalErrors < 1 && totalWarnings < 1) {
    return callback(null, Chalk.green.bold('\nClean as a whistle! No issues found!\n'), exitCode);
  }

  var output = '\n';
  var position = Chalk.gray.bold;
  var error = Chalk.red;
  var warning = Chalk.yellow;
  var colorCode = {
    2: error,
    1: warning
  };

  result.results.forEach(function (file) {
    if (file.errorCount < 1 && file.warningCount < 1) {
      return;
    }

    output += 'Problems in: ' + Chalk.dim(file.filePath) + '\n';

    file.messages.forEach(function (msg) {
      var mainStyle = colorCode[msg.severity] || Chalk.gray;

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
  var fix = options.fix;
  var linter = new CLIEngine({
    configFile: options.configFile,
    useEslintrc: false,
    fix: fix,
    cache: options.cache
  });

  try {
    var result = linter.executeOnFiles(options.files);

    if (fix) {
      CLIEngine.outputFixes(result);
    }

    callback(null, result);
  } catch (err) {
    callback(err);
  }
}


function getFiles (options, callback) {
  var ignore = options.ignore;
  var cwd = options.cwd;
  var files = [];

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
