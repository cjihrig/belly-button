#!/usr/bin/env node
'use strict';

require('../lib/cli').run(process.argv, function (err, output, code) {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }

  console.log(output);
  process.exit(code);
});
