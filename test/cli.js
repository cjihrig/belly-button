'use strict';
const Assert = require('assert');
const ChildProcess = require('child_process');
const Path = require('path');
const Barrier = require('cb-barrier');
const Chalk = require('chalk');
const ESLint = require('eslint');
const Fse = require('fs-extra');
const Glob = require('glob');
const Lab = require('@hapi/lab');
const StandIn = require('stand-in');
const Cli = require('../lib/cli');
const FakeResults = require('./fixtures/fake-results');
const { describe, it, after } = exports.lab = Lab.script();

const fixturesDirectory = Path.join(__dirname, 'fixtures');
const successDirectory = Path.join(fixturesDirectory, 'success');
const failuresDirectory = Path.join(fixturesDirectory, 'fail');
const tempDirectory = Path.join(process.cwd(), 'test-tmp');

describe('Belly Button CLI', () => {
  after(() => {
    const barrier = new Barrier();

    Fse.remove(tempDirectory, (err) => {
      barrier.pass(err);
    });

    return barrier;
  });

  describe('run()', () => {
    it('reports errors', () => {
      const barrier = new Barrier();
      const ignore = Path.join(failuresDirectory, '**');

      Cli.run([
        '-i', successDirectory,
        '-i', ignore
      ], (err, output, exitCode) => {
        Assert.ifError(err);
        Assert(/Total errors: 2/.test(Chalk.stripColor(output)));
        Assert.strictEqual(exitCode, 1);
        barrier.pass();
      });

      return barrier;
    });

    it('successfully ignores files', () => {
      const barrier = new Barrier();
      const ignore = Path.join(failuresDirectory, '**');

      Cli.run([
        '-i', successDirectory,
        '-i', ignore,
        '-I', ignore
      ], (err, output, exitCode) => {
        Assert.ifError(err);
        Assert(typeof output === 'string' && output.length > 0);
        Assert.strictEqual(exitCode, 0);
        barrier.pass();
      });

      return barrier;
    });

    it('fixes linting errors when possible', () => {
      const barrier = new Barrier();
      const src = Path.join(failuresDirectory, 'semi.js');
      const dest = Path.join(tempDirectory, 'semi.js');

      Fse.ensureDirSync(tempDirectory);
      Fse.copySync(src, dest);

      Cli.run(['-w', tempDirectory, '-f'], (err, output, exitCode) => {
        Assert.ifError(err);
        Assert(typeof output === 'string' && output.length > 0);
        Assert.strictEqual(exitCode, 0);
        barrier.pass();
      });

      return barrier;
    });

    it('uses process.cwd() as default working directory', () => {
      const barrier = new Barrier();

      StandIn.replaceOnce(process, 'cwd', () => {
        return successDirectory;
      });

      Cli.run([], (err, output, exitCode) => {
        Assert.ifError(err);
        Assert(typeof output === 'string' && output.length > 0);
        Assert.strictEqual(exitCode, 0);
        barrier.pass();
      });
    });

    it('rejects unknown options', () => {
      const barrier = new Barrier();

      Cli.run(['--foo'], (err, output, exitCode) => {
        Assert(err instanceof Error);
        Assert(/Unknown option: foo/.test(err.message));
        Assert.strictEqual(output, undefined);
        Assert.strictEqual(exitCode, undefined);
        barrier.pass();
      });

      return barrier;
    });

    it('handles glob errors', () => {
      const barrier = new Barrier();
      const glob = Glob.Glob.prototype._process;

      Glob.Glob.prototype._process = function (pattern, index, inGlobStar, callback) {
        Glob.Glob.prototype._process = glob;
        this.emit('error', new Error('glob'));
      };

      Cli.run(['-w', successDirectory], (err, output, exitCode) => {
        Assert(err instanceof Error);
        Assert.strictEqual(err.message, 'glob');
        Assert.strictEqual(output, undefined);
        Assert.strictEqual(exitCode, undefined);
        barrier.pass();
      });

      return barrier;
    });

    it('runs binary successfully', () => {
      const barrier = new Barrier();
      const child = ChildProcess.fork('bin/belly-button', ['-w', successDirectory], { silent: true });

      child.once('error', Assert.ifError);
      child.once('close', (code, signal) => {
        Assert.strictEqual(code, 0);
        Assert.strictEqual(signal, null);
        barrier.pass();
      });

      return barrier;
    });

    it('runs binary with error exit code', () => {
      const barrier = new Barrier();
      const child = ChildProcess.fork('bin/belly-button', ['--foo'], { silent: true });

      child.once('error', Assert.ifError);
      child.once('close', (code, signal) => {
        Assert.strictEqual(code, 1);
        Assert.strictEqual(signal, null);
        barrier.pass();
      });

      return barrier;
    });

    it('only executes print logic when there are errors or warnings', () => {
      const barrier = new Barrier();

      StandIn.replaceOnce(ESLint.CLIEngine.prototype, 'executeOnFiles', () => {
        return {
          errorCount: 1,
          warningCount: 1,
          results: []
        };
      });

      Cli.run(['-w', successDirectory], (err, output, exitCode) => {
        Assert.ifError(err);
        Assert(/total\s+(errors|warnings).+1/i.test(Chalk.stripColor(output)));
        barrier.pass();
      });

      return barrier;
    });

    it('prints messages when there are lint problems', () => {
      const barrier = new Barrier();

      StandIn.replaceOnce(ESLint.CLIEngine.prototype, 'executeOnFiles', () => {
        return FakeResults;
      });

      Cli.run(['-w', successDirectory], (err, output, exitCode) => {
        Assert.ifError(err);
        const out = Chalk.stripColor(output);
        const msg = '\nProblems in: /Home/belly-button/bar.js\n\tFooBar is a weird variable name at line [331], column [1] - (weird-name)\n\tDangling comma at line [12], column [4] - (dangling-comma)\n\tMissing semi colon at line [200], column [3] - (semi-colon)\n\nProblems in: /Home/belly-button/baz.js\n\tDangling comma at line [12], column [4] - (dangling-comma)\n\nResults\nTotal errors: 1\nTotal warnings: 1\n';
        Assert.strictEqual(out, msg);
        barrier.pass();
      });

      return barrier;
    });

    it('defaults to belly-button style', () => {
      const barrier = new Barrier();
      const lintFile = Path.join(fixturesDirectory, 'config', 'yoda.js');
      const child = ChildProcess.fork('bin/belly-button', ['-i', lintFile], { silent: true });

      child.once('error', Assert.ifError);
      child.once('close', (code, signal) => {
        Assert.strictEqual(code, 1);
        Assert.strictEqual(signal, null);
        barrier.pass();
      });

      return barrier;
    });

    it('can override config file', () => {
      const barrier = new Barrier();
      const configFile = Path.join(fixturesDirectory, 'config', '.eslintrc.js');
      const lintFile = Path.join(fixturesDirectory, 'config', 'yoda.js');
      const child = ChildProcess.fork('bin/belly-button', ['-c', configFile, '-i', lintFile], { silent: true });

      child.once('error', Assert.ifError);
      child.once('close', (code, signal) => {
        Assert.strictEqual(code, 0);
        Assert.strictEqual(signal, null);
        barrier.pass();
      });

      return barrier;
    });
  });
});
