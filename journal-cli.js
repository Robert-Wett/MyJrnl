var config   = require('./config.js').config
  , Firebase = require('firebase')
  , baseRef  = new Firebase(config.firebase)
  , _        = require('underscore')
  , entryRef = new Firebase(config.entries)
  , tags     = {};


function parseEntry(line) {
  if (!line) return;

  var words     = line.split('')
    , tagQueue  = []
    , wordQueue = []
    , tagHolder = {}
    // jrnl does some basic time-stamping keywords like 'yesterday' or
    // '3 pm' that resolves to a timestamp. Not hard, can do that later.
    , time      = Date.now()
    , tagRef;

  _.each(words, function(word) {
    if (word[0] === '@' && word[1]) {
      // Create an array with the tag as the key, and sentence as the value
      tagQueue.push([word.slice(1), words]);
    }
    wordQueue.push(word);
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

  entryRef.push({body: line, timestamp: Date.now()});

  /*
  _.each(tagQueue, function(sentence, tag) {
    tagRef = new Firebase(config.firebase + '/' + tag);
    tagRef.push(sentence);
  });
  */
};

parseEntry(process.argv[2]);
