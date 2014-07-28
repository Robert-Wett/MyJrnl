var FBTokenGen = require('firebase-token-generator')
  , Firebase   = require('firebase')
  , program    = require('commander')
  , config     = require('./config.js').config
  , moment     = require('moment')
  , Table      = require('cli-table')
  , chalk      = require('chalk')
  , size       = require('window-size')
  , _          = require('underscore');


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
  getBtc(program.args[0]);
} else {
  parseEntry(process.argv[2]);
}

/**
 * This is a free entry point firebase provides that syncs with
 * coinbase. It's easy to add so I figured I'd put it in, seeing
 * as how I often check the prices
 */
function getBtc(amount) {
  var btcRef = new Firebase("https://publicdata-cryptocurrency.firebaseio.com/bitcoin")
    , btcPrice;
  btcRef.child("last").on("value", function(snap) {
    btcPrice = snap.val();

    if (amount) {
      console.log(chalk.bold(amount) + " is worth " +
                  chalk.bold.green("$" + btcPrice * amount));
    } else {
      console.log("Current "   + chalk.underline("BTC") +
                  " price in " + chalk.underline("USD") +
                  ": " + chalk.green.bold("$" + btcPrice));
    }

    exitProcess();
  });
}

/**
 * Checks if the entry contains a valid imgur (DIRECT) link. Returns the
 * link if it does, otherwise a blank string. The angular front-end displays
 * the link if and only if the 'entry.media' entry isn't a blank string.
 */
function getMediaLink(line) {
  var regex = /http:\/\/i\.imgur\.com\/[a-z0-9]{7}\.[gif|png|jpg|jpeg]{3,4}/i
    , result = line.match(regex);

  if (!!result) {
    return result[0];
  } else {
    return '';
  }
}

/**
 * Get the last journal entries committed. Pass in a number to define
 * the amount of entries to display, starting from the latest entry.
 */
function getEntries(num) {
  var entryQuery
    , tableDim
    , singleCol
    , table
    , entryRef;

  tableDim  = computeTableSize();
  singleCol = tableDim[0] === false;
  num       = num || 10;

  if (singleCol) {
    table = new Table({
      head: ['Body'],
      colWidths: [tableDim[1]]
    });
  } else {
    table = new Table({
      head: ['Date', 'Body'],
      colWidths: [tableDim[0], tableDim[1]]
    });
  }

  entryRef = new Firebase(config.entries);
  entryQuery = entryRef.limit(num).once('value', function(snap) {
    _.each(snap.val(), function(entry) {
      if (singleCol) {
        table.push([
          terminalFormat(entry.body.replace(/\n/g, ''), tableDim[1] - 9)
        ]);
      } else {
        table.push([
          entry.month + '\n' + entry.day,
          terminalFormat(entry.body.replace(/\n/g, ''), tableDim[1] - 9)
        ]);
      }
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
        table.push([key, terminalFormat(entryVal.body)]);
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

/**
 * Main method to take input and store it in firebase.
 */
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
    addToTagCount(tagEntry[0]);
    tagRef = new Firebase(config.firebase + '/tags/');
    tagRef = tagRef.child(tagEntry[0]);
    tagRef.push({body: tagEntry[1]});
    //tagRef.push();
    //tagRef.setWithPriority({body: tagEntry[1]}, Firebase.ServerValue.TIMESTAMP);
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

/**
 * Update the list of tags that just tracks the count
 */
function addToTagCount(tag) {
  var tagRef = new Firebase(config.firebase + '/tag_count/' + tag)
    , data;

  authenticate();

  tagRef.once('value', function(snap) {
    if (snap.val() === null) {
      tagRef.set(1);
    } else {
      tagRef.set(snap.val() + 1);
    }
  });
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

/**
 * Takes a long sentence and returns one formatted to fit
 * within the current terminal size.
 */
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

/**
 * Helper method that returns the proper dimensions for the CLI-Table
 * based on the current TTY window size as the command was issued.
 */
function computeTableSize() {
  var width = size.width
    , height= size.height;

  if (width < 80) {
    // Super small, dis-regard the dates
    return [false, width];
  } else {
    // 9 seems to be the magic number to format
    // longer date names, like September.
    return [9, width - 14];
  }
}

/**
 * Callback function to close out the node process
 */
function exitProcess(err) {
  if (err) {
    console.log("Woops - ", err);
    process.exit(0);
  }
  else
    process.exit(1);
}