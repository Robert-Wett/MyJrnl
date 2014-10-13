#!/usr/bin/env node

var validateInputAmount = require('./db/helpers.js').validateInputAmount
  , exitProcess         = require('./db/helpers.js').exitProcess
  , program             = require('commander');

program
  .version('0.0.1')
  .option('-n, --number',  'See the last <number> of entries')
  .option('-t, --tag',     'See entries containing [tag]')
  .option('-T  --taglist', 'List all tags and their count')
  .option('-f, --feed',    'Start real-time (BTC/LTC/DOGE) price changes (BTC Default)')
  .option('-b, --btc',     'Check Bitcoin prices or set Bitcoin as currency in feed')
  .option('-l, --ltc',     'Check Litecoin prices or set Litecoin as currency in feed')
  .option('-d, --doge',    'Check Dogecoin prices or set Dogecoin as currency in feed')
  //.option('-t,    --to-do',  'Add an entry to the TODO section')
  .option('-s, --search',  'Search for entries with specified text')
  .option('-x, --test',    'Experimental thing')
  .parse(process.argv);

// List the last `n` entries
if (program.number) {
  require('./db/firebase.js')
  .getEntries(+program.args[0])
  .then(function(tableString) {
    console.log(tableString);
    exitProcess();
  });
}
// Start a real-time feed to listen to cryptocurrency price changes.
else if (program.feed) {
  var cryptoPriceHandler = require('./db/firebase.js').cryptoPriceHandler
    , input
    , cc;

  input = validateInputAmount(+program.args[0]);
  if (input[0]) {
    // Something went wrong
    console.log(input[0]);
    process.exit(0);
  }

  // Specify Litecoin
  if (program.ltc) {
    cc = 'litecoin';
  }
  // Specify Dogecoin
  else if (program.doge) {
    cc = 'dogecoin';
  }
  // Specify/Default to Bitcoin
  else {
    cc = 'bitcoin';
  }
  cryptoPriceHandler(cc, true, input[1]);
}
// List current Bitcoin price
else if (program.btc) {
  require('./db/firebase.js')
  .cryptoPriceHandler('bitcoin', false, +program.args[0]);
}
// List current Litecoin price
else if (program.ltc) {
  require('./db/firebase.js')
  .cryptoPriceHandler('litecoin', false, +program.args[0]);
}
// List current Dogecoin price
else if (program.doge) {
  require('./db/firebase.js')
  .cryptoPriceHandler('dogecoin', false, +program.args[0]);
}
// List a number of tags sorted from latest to oldest. If a `tagName` is specified
// then list only entries containing that `tagName`
else if (program.tag) {
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
}
// List every stored tag, sorted by the number of occurences
else if (program.taglist) {
  require('./db/firebase.js').getSortedTagList(program.args[0])
  .then(function(tableString) {
    console.log(tableString);
    exitProcess();
  });
}
// Search local sqlite DB for entries matching supplied text
else if (program.search) {
  require('./db/sqlite.js').searchSentences(program.args[0]);
}
// Test route
else if (program.test) {
  /*
   * This is set aside for experimenting
   */
}
// Add an entry!
else {
  require('./db/firebase.js').parseEntry(program.args.slice().join(" "));
}
