var terminalFormat = require('helpers').computeTableSize
  , getMediaLink   = require('helpers').getMediaLink
  , getTableSize   = require('helpers').computeTableSize
  , exitProcess    = require('helpers').exitProcess
  , FBTokenGen     = require('firebase-token-generator')
  , Firebase       = require('firebase')
  , promise        = require('promise')
  , config         = require('./config.js').config
  , moment         = require('moment')
  , Table          = require('cli-table')
  , chalk          = require('chalk')
  , size           = require('window-size')
  , _              = require('underscore');


/**
 * Update the list of tags that just tracks the count
 */
function addToTagCount(tag) {
  var tagRef = new Firebase(config.firebase + '/tag_count/' + tag);

  authenticate();

  tagRef.once('value', function(snap) {
    tagRef.set((snap.val() || 0) + 1);
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
 * Create an entry in the tag_index collection in order to proide an
 * `entry` -> `tags` connection. This allows for cascading deletes on
 * each tag entry associated with the entry.
 */
function addToTagIndex(postId, tagId, tagName) {
  var tagIndexRef;

  return new promise(function(resolve, reject) {
    tagIndexRef = new Firebase(config.firebase + '/tag_index/' + postId);
    tagIndexRef.push({ tagname: tagName, tag_id: tagId }, function(err) {
      if (err)
        reject(err);
      else
        resolve();
    });
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
 * Main method to take input and store it in firebase.
 */
function parseEntryTesting(line) {
  var escRegex = /(\\)([!|;|"|`|$|^])|(;)/g
    , postHandler
    , entryData
    , mediaData
    , entryRef
    , tagQueue
    , postId
    , tagRef
    , tagId
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
  postId = postHandler.name();

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
    tagId = tagRef.name();
    addToTagIndex(postId, tagId, tagEntry[0]);
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
 * Get the last journal entries committed. Pass in a number to define
 * the amount of entries to display, starting from the latest entry.
 *
 * returns: promise.
 */
function getEntries(num) {
  var tableDim
    , singleCol
    , table
    , entryRef;

  tableDim  = getTableSize();
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
  return new promise(function(resolve, reject) {
    entryRef.limit(num).once('value', function(snap) {
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

      resolve(table.toString());
    });
  });
}

/**
 * Retrieve all tag's and their respective entries. If a `tagName` object
 * is passed in, then only the entries for that tag will be displayed - otherwise,
 * all tags and their entries are displayed.
 *
 * Returns a promise which resolves to a string
 */
function getTags(num, tagName) {
  var entryWidth
    , tagEntries
    , tagQuery
    , tableDim
    , baseRef
    , table;

  baseRef = new Firebase(config.firebase);
  num     = num || 10;

  return new promise(function(resolve, reject) {
    if (tagName) {
      entryWidth = size.width - 10;

      table = new Table({
        head: [tagName],
        colWidths: [entryWidth]
      });

      tagQuery = baseRef.child('tags/' + tagName).once('value', function(snap) {
        tagEntries = snap.val();

        if (!!tagEntries) {
          _.each(snap.val(), function(entry) {
            table.push([terminalFormat(entry.body, entryWidth)]);
          });

          resolve(table.toString());
        } else {
          reject('No tag entries found for tag name: ' + chalk.bold.underline(tagName));
        }
      });

    } else {

      tableDim = getTableSize();

      table = new Table({
        head: ['Tag Name', 'Body'],
        colWidths: [tableDim[0], tableDim[1]]
      });

      tagQuery = baseRef.child('tags').limit(num).once('value', function(snap) {
        _.each(snap.val(), function(entry, key) {
          _.each(entry, function(entryVal) {
            table.push([key, terminalFormat(entryVal.body, tableDim[1])]);
          });
        });

        resolve(table.toString());
      });
    }
  });
}

/**
 * Get a list of all saved tags and their count, sorted
 * from highest count to lowest count.
 *
 * returns a promise that resolves to a string.
 */
function getSortedTagList(input) {
  var tagCountRef = new Firebase(config.firebase + '/tag_count/')
    , tagArray    = []
    , longest     = 0
    , delimited   = []
    , returnVal
    , table;

  return new promise(function(resolve, reject) {
    tagCountRef.on('value', function(tags) {
      tags.forEach(function(childVal) {
        if (childVal.name().length > longest) {
          longest = childVal.name().length;
        }

        tagArray.push([childVal.name(), childVal.val()]);
      });

      tagArray.sort(function(a, b) {
        if (a[1] > b[1])
          return -1;
        if (a[1] < b[1])
          return 1;
        return 0;
      });

      if (size.height < 20) {
        _.each(tagArray, function(tag) {
          delimited.push(chalk.dim(" (")
                        + chalk.red(tag[1])
                        + chalk.dim(")")
                        + chalk.bold.blue(tag[0]));
        });

        returnVal = "\n" + delimited.join(" " + chalk.bgBlack("|") + " ") + "\n";
      } else {
        table = new Table({
          head: ['Tag', 'Count'],
          colWidths: [longest + 2, 8],
          chars: {
            'mid': '',
            'left-mid': '',
            'mid-mid': '',
            'right-mid': ''
          }
        });

        _.each(tagArray, function(tag) {
          table.push([tag[0], tag[1]]);
        });

        returnVal = table.toString();
      }

      resolve(returnVal);
    });
  });
}


/**
 * Track the ASK/BID and LAST BTC prices as they come in, in 'real-time'.
 */
function getBtcFeed(amount) {
  var btcRef = new Firebase("https://publicdata-cryptocurrency.firebaseio.com/bitcoin")
    , last   = "last"
    , ask    = "ask"
    , bid    = "bid"
    , btcPrice
    , handler;

  handler = function(snap, refType, amount ) {
    btcPrice = snap.val();

    //TODO: Set the LAST color to red if deficit, green if positive ;););)(;/)S
    if (amount) {
      console.log((refType === last ? chalk.bold.red.underline(refType.toUpperCase()) : refType.toUpperCase()) +
                  ": " + chalk.bold(amount) + " is worth " +
                  chalk.bold.green("$" + btcPrice * amount));
    } else {
      console.log((refType === last ? chalk.bold.red.underline(refType.toUpperCase()) : refType.toUpperCase()) +
                  ": Current " +  chalk.underline("BTC") +
                  " price in " + chalk.underline("USD") +
                  ": " + chalk.green.bold("$" + btcPrice));
    }
  };

  btcRef.child(last).on("value", function(snap) {
    handler(snap, last, amount);
  });

  btcRef.child(ask).on("value", function(snap) {
    handler(snap, ask, amount);
  });

  btcRef.child(bid).on("value", function(snap) {
    handler(snap, bid, amount);
  });
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