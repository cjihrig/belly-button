'use strict';
var ChildProcess = require('child_process');
var Path = require('path');
var Code = require('code');
var ESLint = require('eslint');
var Glob = require('glob');
var Lab = require('lab');
var Cli = require('../lib/cli');

var lab = exports.lab = Lab.script();
var expect = Code.expect;
var describe = lab.describe;
var it = lab.it;

Code.settings.truncateMessages = false;
Code.settings.comparePrototypes = false;

var fixturesDirectory = Path.join(__dirname, 'fixtures');

describe('Belly Button CLI', function() {
  describe('run()', function() {
    it('successfully lints files', function(done) {
      Cli.run(['-w', fixturesDirectory], function(err, output, exitCode) {
        expect(err).to.not.exist();
        expect(output).to.exist();
        expect(exitCode).to.equal(0);
        done();
      });
    });

    it('fixes linting errors when possible', function(done) {
      // TODO: Improve this test to verify that fixes actually occur.
      // Create a temp copy of a bad file and fix it
      Cli.run(['-w', fixturesDirectory, '-f'], function(err, output, exitCode) {
        expect(err).to.not.exist();
        expect(output).to.exist();
        expect(exitCode).to.equal(0);
        done();
      });
    });

    it('uses process.cwd() as default working directory', function(done) {
      var cwd = process.cwd;

      process.cwd = function() {
        process.cwd = cwd;
        return fixturesDirectory;
      };

      Cli.run([], function(err, output, exitCode) {
        expect(err).to.not.exist();
        expect(output).to.exist();
        expect(exitCode).to.equal(0);
        done();
      });
    });

    it('rejects unknown options', function(done) {
      Cli.run(['--foo'], function(err, output, exitCode) {
        expect(err instanceof Error).to.equal(true);
        expect(err.message).to.match(/Unknown option: foo/);
        expect(output).to.not.exist();
        expect(exitCode).to.not.exist();
        done();
      });
    });

    it('handles ESLint errors', function(done) {
      var executeOnFiles = ESLint.CLIEngine.prototype.executeOnFiles;

      ESLint.CLIEngine.prototype.executeOnFiles = function(files) {
        ESLint.CLIEngine.prototype.executeOnFiles = executeOnFiles;
        throw new Error('executeOnFiles');
      };

      Cli.run(['-w', fixturesDirectory], function(err, output, exitCode) {
        expect(err instanceof Error).to.equal(true);
        expect(err.message).to.equal('executeOnFiles');
        expect(output).to.not.exist();
        expect(exitCode).to.not.exist();
        done();
      });
    });

    it('handles glob errors', function(done) {
      var glob = Glob.Glob.prototype._process;

      Glob.Glob.prototype._process = function(pattern, index, inGlobStar, callback) {
        Glob.Glob.prototype._process = glob;
        this.emit('error', new Error('glob'));
      };

      Cli.run(['-w', fixturesDirectory], function(err, output, exitCode) {
        expect(err instanceof Error).to.equal(true);
        expect(err.message).to.equal('glob');
        expect(output).to.not.exist();
        expect(exitCode).to.not.exist();
        done();
      });
    });

    it('runs binary successfully', function(done) {
      var child = ChildProcess.fork('bin/belly-button', ['-w', fixturesDirectory], {silent: true});

      child.once('error', function(err) {
        expect(err).to.not.exist();
      });

      child.once('close', function(code, signal) {
        expect(code).to.equal(0);
        expect(signal).to.equal(null);
        done();
      });
    });

    it('runs binary with error exit code', function(done) {
      var child = ChildProcess.fork('bin/belly-button', ['--foo'], {silent: true});

      child.once('error', function(err) {
        expect(err).to.not.exist();
      });

      child.once('close', function(code, signal) {
        expect(code).to.equal(1);
        expect(signal).to.equal(null);
        done();
      });
    });
  });
});
