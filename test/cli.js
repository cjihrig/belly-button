'use strict';
const Assert = require('assert');
const ChildProcess = require('child_process');
const Path = require('path');
const Barrier = require('cb-barrier');
const Fse = require('fs-extra');
const Glob = require('glob');
const Lab = require('@hapi/lab');
const StandIn = require('stand-in');
const Cli = require('../lib/cli');
const { describe, it, after } = exports.lab = Lab.script();

const fixturesDirectory = Path.join(__dirname, 'fixtures');
const successDirectory = Path.join(fixturesDirectory, 'success');
const failuresDirectory = Path.join(fixturesDirectory, 'fail');
const tempDirectory = Path.join(process.cwd(), 'test-tmp');

describe('Belly Button CLI', () => {
  after(async () => {
    await Fse.remove(tempDirectory);
  });

  describe('run()', () => {
    it('reports errors', async () => {
      const ignore = Path.join(failuresDirectory, '**');
      const [output, exitCode] = await Cli.run([
        '-i', successDirectory,
        '-i', ignore
      ]);

      Assert.strictEqual(exitCode, 1);
      Assert(/2 problems \(2 errors, 0 warnings\)/.test(output));
    });

    it('successfully ignores files', async () => {
      const ignore = Path.join(failuresDirectory, '**');
      const [output, exitCode] = await Cli.run([
        '-i', successDirectory,
        '-i', ignore,
        '-I', ignore
      ]);

      Assert.strictEqual(exitCode, 0);
      Assert(typeof output === 'string');
    });

    it('fixes linting errors when possible', async () => {
      const src = Path.join(failuresDirectory, 'semi.js');
      const dest = Path.join(tempDirectory, 'semi.js');

      Fse.ensureDirSync(tempDirectory);
      Fse.copySync(src, dest);

      const [output, exitCode] = await Cli.run(['-w', tempDirectory, '-f']);

      Assert.strictEqual(exitCode, 0);
      Assert(typeof output === 'string');
    });

    it('uses process.cwd() as default working directory', async () => {
      StandIn.replaceOnce(process, 'cwd', () => {
        return successDirectory;
      });

      const [output, exitCode] = await Cli.run([]);

      Assert.strictEqual(exitCode, 0);
      Assert(typeof output === 'string');
    });

    it('rejects unknown options', async () => {
      await Assert.rejects(() => {
        return Cli.run(['--foo']);
      }, /Unknown option: foo/);
    });

    it('handles glob errors', async () => {
      const glob = Glob.Glob.prototype._process;

      Glob.Glob.prototype._process = function(pattern, index, inGlobStar, callback) {
        Glob.Glob.prototype._process = glob;
        this.emit('error', new Error('glob'));
      };

      await Assert.rejects(async () => {
        await Cli.run(['-w', successDirectory]);
      }, /Error: glob/);
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
