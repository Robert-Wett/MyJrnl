// #Firebase Helpers
// ----------------
var helpers        = require('./helpers.js')
  , terminalFormat = helpers.terminalFormat
  , getMediaLink   = helpers.getMediaLink
  , getTableSize   = helpers.computeTableSize
  , exitProcess    = helpers.exitProcess
  , FBTokenGen     = require('firebase-token-generator')
  , Firebase       = require('firebase')
  , dbHelper       = require('./sqlite.js')
  , promise        = require('promise')
  , config         = require('../config.js').config
  , moment         = require('moment')
  , Table          = require('cli-table')
  , chalk          = require('chalk')
  , size           = require('window-size')
  , _              = require('underscore');



/**
 * Parse a string into a journal entry backed by Firebase
 * and sqlite
 *
 * @example
 *     parseEntry('My, what a wonderful @day')
 *
 * @param  {String} line  Sentence to parse into journal entry
 * @api public
 */
function parseEntry(line) {
  var db       = dbHelper.createDb()
    , escRegex = /(\\)([!|;|"|`|$|^])|(;)/g
    , postHandler
    , entryData
    , mediaData
    , entryRef
    , postId
    , tagRef
    , tagId
    , words
    , time
    , tags;

  if (!line) {
    exitProcess("You need to provide some input");
  } else {
    authenticate();
  }

  entryRef = new Firebase(config.entriesV2);
  // Unless the tags are properly escaped, then strip them out.
  // This is mostly to strip un-wanted esc chars needed to enter
  // longer, more complicated strings into the command line
  line     = line.replace(escRegex, "$2");
  line     = line.replace('\n', '');
  line     = line.trim();
  words    = line.split(' ');
  time     = moment();
  tags     = [];

  // Pull out the URL for imgur/media links
  mediaData = getMediaLink(line);

  // Craft the POJO to represent the Firebase entry
  entryData = {
    month: time.format('MMMM'),
    day: time.format('DD'),
    sortHour: time.format('H:mm'),
    hour: time.format('h:mm a'),
    media: mediaData,
    body: line
  };

  // Issue a .push() command to create an empty entry
  postHandler = entryRef.push();
  // Insert the entryData into empty entry. We set this entry with
  // priority to enable sortying by date on the front-end
  postHandler.setWithPriority(entryData, Firebase.ServerValue.TIMESTAMP, exitProcess);
  // Grab the unique ID from firebase corresponding to the mongo _id value
  postId = postHandler.name();
  // Insert this entry into our local sqlite DB for searching
  dbHelper.insertEntry(db, postId, entryData.body, entryData.day, entryData.hour, entryData.month);

  // Build the list of tags
  _.each(words, function(word) {
    if (word[0] === '@' && typeof word[1] !== "undefined") {
      word = word.slice(1);
      if (!_.contains(tags, word)) {
        tags.push(word);
      }
    }
  });

  // Commit the tags to Firebase and Sqlite
  _.each(tags, function(tagEntry) {
    // Update the flat `tag_count` collection
    addToTagCount(tagEntry);

    tagRef = new Firebase(config.firebaseV2 + '/tags/');
    tagRef = tagRef.child(tagEntry);
    tagRef.push({body: line});

    tagId = tagRef.name();
    addToTagIndex(postId, tagId, tagEntry);
    dbHelper.insertTag(db, tagId, postId, tagEntry);
  });
}


/**
 * Increment the Firebase list that tracks the total count of the tag.
 *
 * @example
 *     // Increase the tag `nodejs`'s count number'
 *     addToTagCount('nodejs');
 *
 * @param {String} tag  The name of the tag to increment, without the `@`
 * @api private
 */
function addToTagCount(tag) {
  var tagRef = new Firebase(config.firebaseV2 + '/tag_count/' + tag);

  authenticate();

  tagRef.once('value', function(snap) {
    tagRef.set((snap.val() || 0) + 1);
  });
}


/**
 * Create an entry in the tag_index collection in order to proide an
 * `entry` -> `tags` connection. This allows for cascading deletes on
 * each tag entry associated with the entry.
 *
 * @example
 *     addToTagIndex('239DFdf9dFlsdf', '399fsdfhgsd93S', 'hello');
 *
 * @param  {String}   postId  Unique ID belonging to the parent entry
 *                            this tag is included in
 * @param  {String}   tagId   Unique ID for the individual tag in this entry
 * @param  {String}   tagName Actual human-readable name of the tag
 * @return {Promise}  Promise promise object that will resolve to null or reject
 *                    an `err`
 * @api public
 */
function addToTagIndex(postId, tagId, tagName) {
  var tagIndexRef;

  return new promise(function(resolve, reject) {
    tagIndexRef = new Firebase(config.firebaseV2 + '/tag_index/' + postId);
    tagIndexRef.push(tagName, function(err) {
      if (err)
        reject(err);
      else
        resolve();
    });
  });
}


/**
 * Use the firebase assigned secret to generate a token based
 * on an object that can be pulled out in firebase rules for
 * determining priviledges. We are authenticating for "write"
 * priviledges, and the Firebase rule looks like this:
 * `".write": "auth.isAdmin == true"`
 *
 * @api private
 */
function authenticate() {
  var baseRef  = new Firebase(config.firebaseV2)
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
 * @example
 *     getEntries(10); // Log the last 10 entries
 *     getEntries();   // Log the last 10 entries
 *     getEntries(1);  // Log the last entry committed
 *
 * @param {Number} num    The number of entries to return, sorted by
 *                        recently created.
 *
 * @return {Promise} Promise
 * @api public
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
      colWidths: [tableDim[1]]
    });
  } else {
    table = new Table({
      colWidths: [tableDim[0], tableDim[1]]
    });
  }

  entryRef = new Firebase(config.entriesV2);
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
 * @example
 *     // Get the last 2 entries for the tag name `tvquotes`
 *     getTags(2, 'tvquotes');
 *     // Get the last 10 entries
 *     getTags(10);
 *     getTags();
 *
 * @param {Number} num     The number of entries to return, sorted last created.
 * @param {String} tagName Name of the tag to search and then list found entries for.
 *
 * @return {Promise} Promise Resolves to a {String}.
 * @api public
 */
function getTags(num, tagName) {
  var tagEntries
    , entryWidth
    , tagQuery
    , tableDim
    , baseRef
    , table;

  baseRef = new Firebase(config.firebaseV2);
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
 * Get a list of all saved tags and their count, sorted from highest count to
 * lowest count.
 *
 * @example
 *     getSortedTagList().then(function(tags){ console.log(tags); });
 *
 * @api public
 */
function getSortedTagList() {
  var tagCountRef = new Firebase(config.firebaseV2 + '/tag_count/')
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
      console.log("Hmmm decisions.. ", size.height);
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
              'top':    '', 'top-mid':    '', 'top-left':    '', 'top-right':    '',
              'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
              'left':   '', 'left-mid':   '', 'mid':         '', 'mid-mid':      '',
              'right':  '', 'right-mid':  '', 'middle':      '|'
            },
          style: { 'padding-left': 0, 'padding-right': 0 }
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
 * Handler for all CryptoCurrency-related actions. Connects to Firebase
 * for real-time updates on price changes for Bitcoin, Litecoin, and Dogecoin.
 * If `isFeed` is `false`, then it simply prints out the current price and exits.
 *
 * @example
 *     // Output the USD value of 1 BTC for every BID/ASK/LAST
 *     cryptoPriceHandler("bitcoin", true);
 *     // Output the USD value of 10 LTC for every BID/ASK/LAST
 *     cryptoPriceHandler("litecoin", true, 10);
 *     // Output the USD value of 10000 DOGE and exit
 *     cryptoPriceHandler("dogecoin", false, 10000);
 *
 * @param {String}  cc        Cryptocurrency to track ('bitcoin', 'litecoin', 'dogecoin')
 * @param {Boolean} isFeed    If `true`, attach and listen to a live-stream of price changes.
 *                            if `false`, get current price and exit
 * @param {String}  amount    Number of given cryptocurrency to convert to USD
 * @api public
 */
function cryptoPriceHandler(cc, isFeed, amount) {
  var baseUrl = "https://publicdata-cryptocurrency.firebaseio.com/"
    , currencies = ["bitcoin", "litecoin", "dogecoin"]
    , cryptoRef
    , last = "last"
    , ask  = "ask"
    , bid  = "bid";

  if (!_.contains(currencies, cc)) {
    cc = "bitcoin";
  }
  if (!!amount) {
    amount = parseFloat(amount);
  } else {
    amount = null;
  }

  cryptoRef = new Firebase(baseUrl + cc);

  // If we don't want to start a feed, get the `LAST` value, print
  // it to the console, and kill the process
  if (!isFeed) {
    cryptoRef.child(last).on("value", function(snap) {
      printPriceUpdate(cc, last, parseFloat(snap.val()), amount);
      process.exit(1);
    });
  }

  cryptoRef.child(last).on("value", function(snap) {
    printPriceUpdate(cc, last, parseFloat(snap.val()), amount);
  });

  cryptoRef.child(ask).on("value", function(snap) {
    printPriceUpdate(cc, ask, parseFloat(snap.val()), amount);
  });

  cryptoRef.child(bid).on("value", function(snap) {
    printPriceUpdate(cc, bid, parseFloat(snap.val()), amount);
  });
}

/**
 * Prints nicely formatted output to the console regarding cryptocurrency price changes
 *
 * @param {String}  cc        Cryptocurrency to track ('bitcoin', 'litecoin', 'dogecoin')
 * @param {String}  refType   Type of update recieved ('LAST', 'ASK', 'BID')
 * @param {Number}  curPrice  Current price of `cc` in USD
 * @param {String}  amount    Number of given cryptocurrency to convert to USD
 * @api private
 */
function printPriceUpdate(cc, refType, curPrice, amount) {
  var output = [];

  if (amount) {
    output.push(refType === 'last' ? chalk.bold.red.underline(refType.toUpperCase())
                                   : refType.toUpperCase());
    output.push(": " + chalk.bold(amount) + " " + cc + " is worth ");
    output.push(chalk.bold.green("$" + curPrice * amount));
  } else {
    output.push(refType === 'last' ? chalk.bold.red.underline(refType.toUpperCase())
                                   : refType.toUpperCase());
    output.push(": Current " +  chalk.underline(cc) + " price in " + chalk.underline("USD"));
    output.push(": " + chalk.green.bold("$" + curPrice));
  }

  console.log(output.join(""));
}



module.exports = {
  getTags: getTags,
  getEntries: getEntries,
  parseEntry: parseEntry,
  addToTagCount: addToTagCount,
  addToTagIndex: addToTagIndex,
  getSortedTagList: getSortedTagList,
  cryptoPriceHandler: cryptoPriceHandler
};