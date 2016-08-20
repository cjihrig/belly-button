# belly-button

[![Current Version](https://img.shields.io/npm/v/belly-button.svg)](https://www.npmjs.org/package/belly-button)
[![Build Status via Travis CI](https://travis-ci.org/continuationlabs/belly-button.svg?branch=master)](https://travis-ci.org/continuationlabs/belly-button)
![Dependencies](http://img.shields.io/david/continuationlabs/belly-button.svg)

Continuation Labs linter based on ESLint. See `.eslintrc.js` file in project root for ESLint settings.


## Usage

`belly-button` is intended to be run from the command line. Either install `belly-button` globally (using `npm i -g belly-button`), or add it to the `devDependencies` section of your `package.json` file (preferred). Then, run the command `belly-button` from the command line, or from within your `package.json`'s `scripts` section as shown below.

```
"scripts": {
  "lint": "belly-button"
}
```

This allows you to issue the command `npm run lint`, which will run JavaScript source code through `belly-button`. See the command line documentation below for more details on settings and available options.

## Command Line

`belly-button` accepts the following command line options:

  - `-i` (alias `--input`) - Glob specifying files to lint. This flag can be specified multiple times to specify multiple globs. If this flag is not provided, the inputs default to `'**/*.js'`.
  - `-I` (alias `--ignore`) - Glob specifying files to be ignored by the linter. This flag can be specified multiple times to specify multiple globs. If this flag is not provided, the ignore glob default to `'node_modules/**'`.
  - `-f` (alias `--fix`) - Boolean. This flag, when `true`, causes ESLint to automatically fix any linting errors that it can. Note that not all errors can be automatically corrected. Defaults to `false`.
  - `-C` (alias `--cache`) - Boolean. When, `true`, enables ESLint's result caching feature. This can improve linting times on subsequent runs. Defaults to `true`.
  - `-w` (alias `--pwd`) - String. Specifies the current working directory to use. If not specified, defaults to `process.cwd()`.

## Badge

If you like our style, maybe slap this badge onto your project somewhere.

[![belly-button-style](https://cdn.rawgit.com/continuationlabs/belly-button/master/badge.svg)](https://github.com/continuationlabs/belly-button)

```markdown
[![belly-button-style](https://cdn.rawgit.com/continuationlabs/belly-button/master/badge.svg)](https://github.com/continuationlabs/belly-button)
```
