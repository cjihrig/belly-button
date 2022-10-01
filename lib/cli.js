'use strict';
const Path = require('path');
const Util = require('util');
const Bossy = require('@hapi/bossy');
const { ESLint } = require('eslint');
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


module.exports.run = async function(argv) {
  const args = Bossy.parse(cliArgs, { argv });

  if (args instanceof Error) {
    throw new Error(Bossy.usage(cliArgs, args.message));
  }

  const globs = args.input;
  const ignore = args.ignore;
  const cwd = args.pwd || process.cwd();
  const files = await getFilesToLint({ globs, ignore, cwd });
  const linter = new ESLint({
    overrideConfigFile: args.config,
    useEslintrc: false,
    fix: args.fix,
    cache: args.cache
  });
  const result = await linter.lintFiles(files);
  const hasErrors = result.some((current) => {
    return current.errorCount > 0;
  });

  if (args.fix) {
    await ESLint.outputFixes(result);
  }

  const formatter = await linter.loadFormatter('stylish');
  const output = formatter.format(result);

  return [output, +hasErrors];
};


function getFiles(options, callback) {
  let files = [];
  const globOptions = {
    realpath: true,
    ignore: options.ignore,
    cwd: options.cwd
  };

  for (let i = 0; i < globOptions.ignore.length; i++) {
    globOptions.ignore[i] = convertWindowsGlobSlashes(globOptions.ignore[i]);
  }

  Insync.each(options.globs, (pattern, next) => {
    Glob(convertWindowsGlobSlashes(pattern), globOptions, (err, paths) => {
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


function convertWindowsGlobSlashes(p) {
  // Glob only supports forward slashes as glob path separators on Windows.
  // $lab:coverage:off$
  if (process.platform === 'win32') {
    return p.split(Path.sep).join(Path.posix.sep);
  }

  return p;
  // $lab:coverage:on$
}
