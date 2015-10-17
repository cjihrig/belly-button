#!/usr/bin/env node

require('../lib/cli').run(process.argv, function(err, output) {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  console.log(output);
  process.exit(0);
});
