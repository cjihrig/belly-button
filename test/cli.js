'use strict';
var ChildProcess = require('child_process');
var Path = require('path');
var Chalk = require('chalk');
var Code = require('code');
var ESLint = require('eslint');
var Fse = require('fs-extra');
var Glob = require('glob');
var Lab = require('lab');
var StandIn = require('stand-in');
var Cli = require('../lib/cli');
var FakeResults = require('./fixtures/fake-results');

var lab = exports.lab = Lab.script();
var expect = Code.expect;
var describe = lab.describe;
var it = lab.it;

Code.settings.truncateMessages = false;
Code.settings.comparePrototypes = false;

var fixturesDirectory = Path.join(__dirname, 'fixtures');
var successDirectory = Path.join(fixturesDirectory, 'success');
var failuresDirectory = Path.join(fixturesDirectory, 'fail');
var tempDirectory = Path.join(process.cwd(), 'test-tmp');

describe('Belly Button CLI', function () {
  lab.after(function (done) {
    Fse.remove(tempDirectory, done);
  });

  describe('run()', function () {
    it('reports errors', function (done) {
      var ignore = Path.join(failuresDirectory, '**');

      Cli.run([
        '-i', successDirectory,
        '-i', ignore
      ], function (err, output, exitCode) {
        expect(err).to.not.exist();
        expect(Chalk.stripColor(output)).to.match(/Total errors: 2/);
        expect(exitCode).to.equal(1);
        done();
      });
    });

    it('successfully ignores files', function (done) {
      var ignore = Path.join(failuresDirectory, '**');

      Cli.run([
        '-i', successDirectory,
        '-i', ignore,
        '-I', ignore
      ], function (err, output, exitCode) {
        expect(err).to.not.exist();
        expect(output).to.exist();
        expect(exitCode).to.equal(0);
        done();
      });
    });

    it('fixes linting errors when possible', function (done) {
      var src = Path.join(failuresDirectory, 'semi.js');
      var dest = Path.join(tempDirectory, 'semi.js');
      Fse.ensureDirSync(tempDirectory);
      Fse.copySync(src, dest);

      Cli.run(['-w', tempDirectory, '-f'], function (err, output, exitCode) {
        expect(err).to.not.exist();
        expect(output).to.exist();
        expect(exitCode).to.equal(0);
        done();
      });
    });

    it('uses process.cwd() as default working directory', function (done) {
      StandIn.replace(process, 'cwd', function (stand) {
        stand.restore();
        return successDirectory;
      });

      Cli.run([], function (err, output, exitCode) {
        expect(err).to.not.exist();
        expect(output).to.exist();
        expect(exitCode).to.equal(0);
        done();
      });
    });

    it('rejects unknown options', function (done) {
      Cli.run(['--foo'], function (err, output, exitCode) {
        expect(err instanceof Error).to.equal(true);
        expect(err.message).to.match(/Unknown option: foo/);
        expect(output).to.not.exist();
        expect(exitCode).to.not.exist();
        done();
      });
    });

    it('handles ESLint errors', function (done) {
      StandIn.replace(ESLint.CLIEngine.prototype, 'executeOnFiles', function (stand, files) {
        stand.restore();
        throw new Error('executeOnFiles');
      });

      Cli.run(['-w', successDirectory], function (err, output, exitCode) {
        expect(err instanceof Error).to.equal(true);
        expect(err.message).to.equal('executeOnFiles');
        expect(output).to.not.exist();
        expect(exitCode).to.not.exist();
        done();
      });
    });

    it('handles glob errors', function (done) {
      var glob = Glob.Glob.prototype._process;

      Glob.Glob.prototype._process = function (pattern, index, inGlobStar, callback) {
        Glob.Glob.prototype._process = glob;
        this.emit('error', new Error('glob'));
      };

      Cli.run(['-w', successDirectory], function (err, output, exitCode) {
        expect(err instanceof Error).to.equal(true);
        expect(err.message).to.equal('glob');
        expect(output).to.not.exist();
        expect(exitCode).to.not.exist();
        done();
      });
    });

    it('runs binary successfully', function (done) {
      var child = ChildProcess.fork('bin/belly-button', ['-w', successDirectory], {silent: true});

      child.once('error', function (err) {
        expect(err).to.not.exist();
      });

      child.once('close', function (code, signal) {
        expect(code).to.equal(0);
        expect(signal).to.equal(null);
        done();
      });
    });

    it('runs binary with error exit code', function (done) {
      var child = ChildProcess.fork('bin/belly-button', ['--foo'], {silent: true});

      child.once('error', function (err) {
        expect(err).to.not.exist();
      });

      child.once('close', function (code, signal) {
        expect(code).to.equal(1);
        expect(signal).to.equal(null);
        done();
      });
    });

    it('only executes print logic when there are errors or warnings', function (done) {
      StandIn.replace(ESLint.CLIEngine.prototype, 'executeOnFiles', function (stand, files) {
        stand.restore();
        return {
          errorCount: 1,
          warningCount: 1,
          results: []
        };
      });

      Cli.run(['-w', successDirectory], function (err, output, exitCode) {
        expect(err).to.not.exist();
        var out = Chalk.stripColor(output);
        expect(out).to.match(/total\s+(errors|warnings).+1/i);
        done();
      });
    });

    it('prints messages when there are lint problems', function (done) {
      StandIn.replace(ESLint.CLIEngine.prototype, 'executeOnFiles', function (stand, files) {
        stand.restore();
        return FakeResults;
      });

      Cli.run(['-w', successDirectory], function (err, output, exitCode) {
        expect(err).to.not.exist();
        var out = Chalk.stripColor(output);
        expect(out).to.equal('\nProblems in: /Home/belly-button/bar.js\n\tFooBar is a weird variable name at line [331], column [1] - (weird-name)\n\tDangling comma at line [12], column [4] - (dangling-comma)\n\tMissing semi colon at line [200], column [3] - (semi-colon)\n\nProblems in: /Home/belly-button/baz.js\n\tDangling comma at line [12], column [4] - (dangling-comma)\n\nResults\nTotal errors: 1\nTotal warnings: 1\n');
        done();
      });
    });

    it('defaults to belly-button style', function (done) {
      var lintFile = Path.join(fixturesDirectory, 'config', 'yoda.js');
      var child = ChildProcess.fork('bin/belly-button', ['-i', lintFile], {silent: true});

      child.once('error', function (err) {
        expect(err).to.not.exist();
      });

      child.once('close', function (code, signal) {
        expect(code).to.equal(1);
        expect(signal).to.equal(null);
        done();
      });
    });

    it('can override config file', function (done) {
      var configFile = Path.join(fixturesDirectory, 'config', '.eslintrc.js');
      var lintFile = Path.join(fixturesDirectory, 'config', 'yoda.js');
      var child = ChildProcess.fork('bin/belly-button', ['-c', configFile, '-i', lintFile], {silent: true});

      child.once('error', function (err) {
        expect(err).to.not.exist();
      });

      child.once('close', function (code, signal) {
        expect(code).to.equal(0);
        expect(signal).to.equal(null);
        done();
      });
    });
  });
});
