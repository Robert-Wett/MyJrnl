var config     = require('./config.js').config
  , _          = require('underscore')
  , program    = require('commander')
  , Firebase   = require('firebase')
  , FBTokenGen = require('firebase-token-generator')
  , Table      = require('cli-table')
  , chalk      = require('chalk')
  , moment     = require('moment');
  //, noop       = function(){};


program
  .version('0.0.1')
  .option('-n, --number', 'See the last <number> of entries')
  .option('-t, --tag',    'See entries containing [tag]')
  .option('-T, --todo',   'Add an entry to the TODO section')
  .option('-b, --btc',    'Check the current BTC price in USD')
  //.option('-x, --test',   'Experimental thing')
  .parse(process.argv);

if (program.number) {
  getEntries(+program.args[0]);
} else if (program.tag) {
  getTags();
} else if (program.btc) {
  getBtc();
//} else if (program.test) {
//  console.log(terminalFormat(process.argv[3]))
} else {
  parseEntry(process.argv[2]);
}

/**
 * This is a free entry point firebase provides that syncs with
 * coinbase. It's easy to add so I figured I'd put it in, seeing
 * as how I often check the prices
 */
function getBtc() {
  var btcRef = new Firebase("https://publicdata-cryptocurrency.firebaseio.com/bitcoin");
  btcRef.child("last").on("value", function(snap) {
    console.log("Current " + chalk.underline("BTC")
                + " price in " + chalk.underline("USD")
                + ": " + chalk.green.bold("$" + snap.val()));
    exitProcess();
  });
}

function getMediaLink(line) {
  var regex = /http:\/\/i\.imgur\.com\/[a-z0-9]{7}\.[gif|png|jpg|jpeg]{3,4}/i
    , result = line.match(regex);

  if (!!result) {
    return result[0];
  } else {
    return '';
  }
}

function getEntries(num) {
  var entryQuery
    , table
    , entryRef;

  num = num || 10;
  table = new Table({
    head: ['Date', 'Body'],
    colWidths: [9, 71]
  });

  entryRef = new Firebase(config.entries);
  entryQuery = entryRef.limit(num).once('value', function(snap) {
    _.each(snap.val(), function(entry) {
      table.push([
        entry.month + '\n' + entry.day,
        terminalFormat(entry.body.replace(/\n/g, ''))
      ]);
    });
    console.log(table.toString());
    exitProcess();
  });
}

function getTags(num) {
  var tagQuery
    , table
    , baseRef;

  num = num || 10;

  table = new Table({
    head: ['Tag', 'Entry'],
    colWidths: [10, 100]
  });

  baseRef = new Firebase(config.firebase);
  tagQuery = baseRef.child('tags').limit(num).once('value', function(snap) {
    _.each(snap.val(), function(entry, key, list) {
      _.each(entry, function(entryVal) {
        table.push([key, formatTerminal(entryVal.body)]);
      });
    });
    console.log(table.toString());
    exitProcess();
  });
}

/**
 * Use the firebase assigned secret to generate a token based
 * on an object that can be pulled out in firebase rules for
 * determining privs.
 * `".write": "auth.isAdmin == true"`
 */
function authenticate() {
  var baseRef  = new Firebase(config.firebase)
    , tokenGen = new FBTokenGen(config.secret)
    , token    = tokenGen.createToken({ "isAdmin": true });

  baseRef.auth(token, function(err) {
    if (err) console.log(err);
  });
}

function parseEntry(line) {
  var escRegex = /(\\)([!|;|"|`|$|^])|(;)/g
    , postHandler
    , entryData
    , mediaData
    , entryRef
    , tagQueue
    , tagRef
    , words
    , time;

  if (!line) {
    exitProcess("You need to provide some input");
  } else {
    authenticate();
  }

  entryRef = new Firebase(config.firebase + '/entries');
  // Unless the tags are properly escaped, then strip them out.
  // This is mostly to strip un-wanted esc chars needed to enter
  // longer, more complicated strings into the command line
  line     = line.replace(escRegex, "$2");
  line     = line.replace('\n', '');
  line     = line.trim();
  words    = line.split(' ');
  time     = moment();
  tagQueue = [];

  _.each(words, function(word) {
    if (word[0] === '@' && typeof word[1] !== "undefined") {
      // Create an array with the tag as the key, and sentence as the value
      tagQueue.push([word.slice(1), line]);
    }
  });

  // Build the hash/object for tags
  _.each(tagQueue, function(tagEntry) {
    if (tagQueue[tagEntry[0]]) {
      tagQueue[tagEntry[0]].push(tagEntry[1]);
    }
    else {
      tagQueue[tagEntry[0]] = [tagEntry[1]];
    }
  });

  _.each(tagQueue, function(tagEntry) {
    tagRef = new Firebase(config.firebase + '/tags/');
    tagRef = tagRef.child(tagEntry[0]);
    tagRef.push({body: tagEntry[1]});
  });

  // Pull out the URL for imgur/media links
  mediaData = getMediaLink(line);

  entryData = {
    month: time.format('MMMM'),
    day: time.format('DD'),
    sortHour: time.format('H:mm'),
    hour: time.format('h:mm a'),
    media: mediaData,
    body: line
  };

  postHandler = entryRef.push();
  postHandler.setWithPriority(entryData, Firebase.ServerValue.TIMESTAMP, exitProcess);
}

function getNextPriority() {
  var currentPriority
    , priorityRef = new Firebase(config.firebase + '/priority');

  priorityRef.transaction(function(curVal) {
    return curVal + 1;
  }, function(error, committed, snapshot) {
    currentPriority = snapshot.val();
  });

  return currentPriority;
}

function terminalFormat(sentence, width) {
  var formattedSentence = []
    , width             = width || 60
    , count             = 0;

  _.each(sentence.split(' '), function(word) {
    if (count + word.length > width) {
      formattedSentence.push('\n' + word);
      count = 0;
    } else {
      formattedSentence.push(word);
      count += word.length + 1;
    }
  });

  return formattedSentence.join(" ");
}

function exitProcess(err) {
  if (err) {
    console.log("Woops - ", err);
    process.exit(0);
  }
  else
    process.exit(1);
}
