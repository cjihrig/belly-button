# belly-button

[![Current Version](https://img.shields.io/npm/v/belly-button.svg)](https://www.npmjs.org/package/belly-button)
[![belly-button-style](https://img.shields.io/badge/eslint-bellybutton-4B32C3.svg)](https://github.com/cjihrig/belly-button)

Pre-canned linting setup based on ESLint. See `.eslintrc.js` file in project root for ESLint settings.


## Usage

`belly-button` is intended to be run from the command line, or from within your `package.json`'s `scripts` section as shown below.

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
