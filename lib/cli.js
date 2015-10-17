'use strict';
var Path = require('path');
var ESLint = require('eslint');
var Glob = require('glob');
var Insync = require('insync');
var CLIEngine = ESLint.CLIEngine;
var defaults = {
  globs: ['**/*.js'],
  ignore: ['node_modules/**']
};


module.exports.run = function(argv, callback) {
  // TODO: Parse arguments
  var globs = defaults.globs;
  var ignore = defaults.ignore;

  getFiles(globs, ignore, function(err, files) {
    if (err) {
      return callback(err);
    }

    var linter = new CLIEngine({
      configFile: Path.join(__dirname, '..', '.eslintrc'),
      useEslintrc: false
    });
    var result;

    try {
      result = linter.executeOnFiles(files);
    } catch (err) {
      result = err;
    }

    // TODO: Add output formatting - callback with string data
    console.log(JSON.stringify(result, null, 2));
    callback();
  });
};


function getFiles(globs, ignore, callback) {
  var files = [];

  Insync.each(globs, function(pattern, next) {
    Glob(pattern, {
      realpath: true,
      ignore: ignore
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
