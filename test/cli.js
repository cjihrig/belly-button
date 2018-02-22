'use strict';
const ChildProcess = require('child_process');
const Path = require('path');
const ESLint = require('eslint');
const Fse = require('fs-extra');
const Glob = require('glob');
const Lab = require('lab');
const StandIn = require('stand-in');
const Cli = require('../lib/cli');
const FakeResults = require('./fixtures/fake-results');
const stripAnsi = require('strip-ansi');

const lab = exports.lab = Lab.script();
const expect = lab.expect;
const describe = lab.describe;
const it = lab.it;

Lab.assertions.settings.truncateMessages = false;
Lab.assertions.settings.comparePrototypes = false;

const fixturesDirectory = Path.join(__dirname, 'fixtures');
const successDirectory = Path.join(fixturesDirectory, 'success');
const failuresDirectory = Path.join(fixturesDirectory, 'fail');
const tempDirectory = Path.join(process.cwd(), 'test-tmp');

describe('Belly Button CLI', function () {
  lab.after(function (done) {
    Fse.remove(tempDirectory, done);
  });

  describe('run()', function () {
    it('reports errors', function (done) {
      const ignore = Path.join(failuresDirectory, '**');

      Cli.run([
        '-i', successDirectory,
        '-i', ignore
      ], function (err, output, exitCode) {
        expect(err).to.not.exist();
        expect(stripAnsi(output)).to.match(/Total errors: 2/);
        expect(exitCode).to.equal(1);
        done();
      });
    });

    it('successfully ignores files', function (done) {
      const ignore = Path.join(failuresDirectory, '**');

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
      const src = Path.join(failuresDirectory, 'semi.js');
      const dest = Path.join(tempDirectory, 'semi.js');
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
      const glob = Glob.Glob.prototype._process;

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
      const child = ChildProcess.fork('bin/belly-button', ['-w', successDirectory], {silent: true});

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
      const child = ChildProcess.fork('bin/belly-button', ['--foo'], {silent: true});

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
        const out = stripAnsi(output);
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
        const out = stripAnsi(output);
        expect(out).to.equal('\nProblems in: /Home/belly-button/bar.js\n\tFooBar is a weird variable name at line [331], column [1] - (weird-name)\n\tDangling comma at line [12], column [4] - (dangling-comma)\n\tMissing semi colon at line [200], column [3] - (semi-colon)\n\nProblems in: /Home/belly-button/baz.js\n\tDangling comma at line [12], column [4] - (dangling-comma)\n\nResults\nTotal errors: 1\nTotal warnings: 1\n');
        done();
      });
    });

    it('defaults to belly-button style', function (done) {
      const lintFile = Path.join(fixturesDirectory, 'config', 'yoda.js');
      const child = ChildProcess.fork('bin/belly-button', ['-i', lintFile], {silent: true});

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
      const configFile = Path.join(fixturesDirectory, 'config', '.eslintrc.js');
      const lintFile = Path.join(fixturesDirectory, 'config', 'yoda.js');
      const child = ChildProcess.fork('bin/belly-button', ['-c', configFile, '-i', lintFile], {silent: true});

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
