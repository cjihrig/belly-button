'use strict';
var Path = require('path');
var Bossy = require('bossy');
var ESLint = require('eslint');
var Glob = require('glob');
var Insync = require('insync');
var CLIEngine = ESLint.CLIEngine;
var defaults = {
  globs: ['**/*.js'],
  ignore: ['node_modules/**']
};
var cliArgs = {
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
  'w': {
    description: 'Working directory',
    alias: 'pwd',
    type: 'string',
    require: false,
    multiple: false
  }
};


module.exports.run = function(argv, callback) {
  var args = Bossy.parse(cliArgs, {argv: argv});

  if (args instanceof Error) {
    return callback(Bossy.usage(cliArgs, args.message));
  }

  var globs = args.input;
  var ignore = args.ignore;
  var fix = args.fix;
  var cwd = args.pwd || process.cwd();

  getFiles({
    globs: globs,
    ignore: ignore,
    cwd: cwd
  }, function(err, files) {
    if (err) {
      return callback(err);
    }

    var linter = new CLIEngine({
      configFile: Path.join(__dirname, '..', '.eslintrc'),
      useEslintrc: false,
      fix: fix
    });
    var result;

    try {
      result = linter.executeOnFiles(files);

      if (fix) {
        CLIEngine.outputFixes(result);
      }
    } catch (err) {
      return callback(err.message);
    }

    // TODO: Add output formatting - callback with string data
    callback(null, result);
  });
};


function getFiles(options, callback) {
  var ignore = options.ignore;
  var cwd = options.cwd;
  var files = [];

  Insync.each(options.globs, function(pattern, next) {
    Glob(pattern, {
      realpath: true,
      ignore: ignore,
      cwd: cwd
    }, function(err, paths) {
      if (err) {
        return next(err);
      }

      files = files.concat(paths);
      next();
    });
  }, function(err) {
    callback(err, files);
  });
}
