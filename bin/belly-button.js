#!/usr/bin/env node
'use strict';

async function main() {
  try {
    const [output, code] = await require('../lib/cli').run(process.argv);

    console.log(output);
    process.exit(code);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
