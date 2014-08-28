#!/usr/bin/env node

var exitProcess = require('./db/helpers.js').exitProcess
  , inquirer    = require('inquirer')
  , program     = require('commander')
  , _           = require('underscore');

program
  .version('0.0.1')
  .option('-n,    --number', 'See the last <number> of entries')
  .option('-t,    --tag',    'See entries containing [tag]')
  .option('-t,    --to-do',  'Add an entry to the TODO section')
  .option('-b,    --btc',    'Check the current BTC price in USD')
  .option('-s,    --search', 'Search for entries with specified text')
  .option('--btcfeed',       'Stream BTC price changes to console')
  .option('-x,    --test',   'Experimental thing')
  .option('--taglist',       'List all tags and their count')
  .parse(process.argv);

if (program.number) {
  require('./db/firebase.js')
  .getEntries(+program.args[0])
  .then(function(tableString) {
    console.log(tableString);
    exitProcess();
  });
} else if (program.tag) {
  require('./db/firebase.js')
  .getTags(10, program.args[0])
  .then(
    function(tableString) {
      console.log(tableString);
      exitProcess();
    },
    function(err) {
      exitProcess(err);
    }
  );
} else if (program.btc) {
  require('./db/firebase.js').getBtc(+program.args[0]);
} else if (program.taglist) {
  require('./db/firebase.js').getSortedTagList(program.args[0])
  .then(function(tableString) {
    console.log(tableString);
    exitProcess();
  });
} else if (program.test) {
  require('./db/firebase.js')
  .getEntries2(+program.args[0])
  .then(function(inqArr) {
    inquirer.prompt([
      {
        type: "list",
        name: "Entries",
        message: "Listing entries",
        paginated: true,
        choices: inqArr
      }
    ]);
  });
} else if (program.btcfeed) {
  require('./db/firebase.js').getBtcFeed(+program.args[0]);
} else if (program.search) {
  require('./db/sqlite.js').searchSentences(program.args[0]);
} else {
  require('./db/firebase.js').parseEntry(process.argv[2]);
}