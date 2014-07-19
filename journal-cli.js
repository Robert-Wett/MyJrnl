var program = require('commander')
  , db      = require('storage')
  , tags    = {};

var line = parseEntry(process.argv[1]);

function parseEntry(line) {
  var words     = line.split('')
    , tagQueue  = []
    , wordQueue = []
    // jrnl does some basic time-stamping keywords like 'yesterday' or
    // '3 pm' that resolves to a timestamp. Not hard, can do that later.
    , time      = Date.now();

  _.each(words, function(word) {
    if (word[0] === '@' && word[1]) {
      // Create an array with the tag as the key, and sentence as the value
      tagQueue.push([word, words]);
    }
    wordQueue.push(word);
  });

  _.each(tagQueue, function(tag) {
    tags[tag[0]] = tag[1];
  });

  // Add the entry to the DB
  db.add(entry, {
    entry: wordQueue.join(""),
    tags: _.each(tagQueue, function(t) { return t[0]; }),
    t_stamp: time
  });

  // For each tag (key) in the sentence, add the sentence as a value.
  _.each(tagQueue, function(entry) {
    db.add(tag, {
      tag: entry[0],
      entry: entry[1]
    });
  });
};

/*
TODO://lots
The `db` object is complete conjecture at this point, though it's probably
not far off from 50 npm libs :)
*/