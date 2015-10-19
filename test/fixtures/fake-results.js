module.exports = {
  results: [{
    filePath: '/Home/belly-button/foo.js',
    messages: [],
    errorCount: 0,
    warningCount: 0
  }, {
    filePath: '/Home/belly-button/bar.js',
    messages: [{
      message: 'FooBar is a weird variable name.',
      column: 1,
      line: 331,
      ruleId: 'weird-name',
      severity: 0
    }, {
      message: 'Dangling comma.',
      column: 4,
      line: 12,
      ruleId: 'dangling-comma',
      severity: 1
    }, {
      message: 'Missing semi colon.',
      column: 3,
      line: 200,
      ruleId: 'semi-colon',
      severity: 2
    }],
    errorCount: 1,
    warningCount: 0
  }, {
    filePath: '/Home/belly-button/baz.js',
    messages: [{
      message: 'Dangling comma.',
      column: 4,
      line: 12,
      ruleId: 'dangling-comma',
      severity: 1
    }],
    errorCount: 0,
    warningCount: 1
  }],
  errorCount: 1,
  warningCount: 1
};
