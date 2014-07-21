var config   = require('./config.js').config
  , program  = require('commander')
  , Firebase = require('firebase')
  , baseRef  = new Firebase(config.firebase)
  , _        = require('underscore')
  , entryRef = new Firebase(config.entries)
  , tags     = {};


program
  .version('0.0.1')
  .option('-n, --number', 'See the last [number] of entries')
  .option('-t, --tag'   , 'See entries containing [tag]')
  .parse(process.argv);

if (program.number) {
  getEntries();
} else if (program.tag) {
  getTags();
} else {
  parseEntry(process.argv[2]);
}


function getEntries(num) {
  num = num || 10;
  var entryQuery = entryRef.limit(num).once('value', function(snap) {
    _.each(snap.val(), function(entry) {
      console.log(entry.body);
    });
  });
}

function getTags(num) {
  num = num || 10;
  var entryQuery = baseRef.child('tags').limit(num).once('value', function(snap) {
    _.each(snap.val(), function(entry, key, list) {
      _.each(entry, function(entryVal) {
        console.log(key + ' -> ' + entryVal);
      });
    });
  });
}

function parseEntry(line) {
  if (!line) return;

  var words     = line.split(' ')
    , tagQueue  = []
    // jrnl does some basic time-stamping keywords like 'yesterday' or
    // '3 pm' that resolves to a timestamp. Not hard, can do that later.
    , time      = Date.now()
    , tagRef;

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
      tags[tagEntry[0]] = [tagEntry[1]];
    }
  });

  _.each(tagQueue, function(tagEntry) {
    tagRef = new Firebase(config.firebase + '/tags/');
    tagRef = tagRef.child(tagEntry[0]);
    tagRef.push(tagEntry[1]);
  });

  entryRef.push({body: line, timestamp: Date.now()});
};

