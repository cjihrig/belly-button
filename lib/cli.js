'use strict';
var Path = require('path');
var Bossy = require('bossy');
var ESLint = require('eslint');
var Glob = require('glob');
var Insync = require('insync');
var CLIEngine = ESLint.CLIEngine;
var defaults = {
  configFile: Path.join(__dirname, '..', '.eslintrc'),
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
    return callback(new Error(Bossy.usage(cliArgs, args.message)));
  }

  var configFile = defaults.configFile;
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

    lintFiles({
      configFile: configFile,
      fix: fix,
      files: files
    }, function(err, result) {
      if (err) {
        return callback(err);
      }

      formatResults(result, callback);
    });
  });
};


function formatResults(results, callback) {
  var totalWarnings = results.warningCount;
  var totalErrors = results.errorCount;
  var exitCode = +!!totalErrors;
  var output = '';

  // TODO: Make this much more visually appealing
  results.results.forEach(function(file) {
    output += 'input file: ' + file.filePath + '\n';

    file.messages.forEach(function(msg) {
      // output += msg.ruleId + ' at line ' + msg.line + ', column ' + msg.column + ': ' + msg.message + '\n';
    });

    output += '\n';
  });

  output += 'total warnings: ' + totalWarnings + '\n';
  output += 'total errors: ' + totalErrors;
  callback(null, output, exitCode);
}


function lintFiles(options, callback) {
  var fix = options.fix;
  var linter = new CLIEngine({
    configFile: options.configFile,
    useEslintrc: false,
    fix: fix
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
