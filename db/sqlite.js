var terminalFormat = require('./helpers.js').terminalFormat
  , exitProcess    = require('./helpers.js').exitProcess
  , config         = require('../config.js').config
  , noop           = require('./helpers.js').noop
  , Firebase       = require('firebase')
  , sqlite3        = require('sqlite3')
  , Promise        = require('promise')
  , chalk          = require('chalk')
  , util           = require('util')
  , _              = require('underscore');
/* ----------------------------------------------------- */


function getDb(path) {
  path = path || config.dbPath2;
  return new sqlite3.Database(path);
}

// ###createDb
// Builds the sqlite database if it doesn't already exist.
//
// *returns* a reference to the newly created db, or the db
// previously built.
function createDb(callback) {
  var entryTable
    , tagTable
    , db;

  // If no `cb` or callback object is passed - or if the `cb`
  // object passed isn't a function, set the `cb` object to
  // a noop, or `function(){}`
  if (!!callback || typeof callback !== "function") {
    callback = noop;
  }

  db  = getDb();

  // **entry**                        <br/>
  // `id`      -- Unique ID           <br/>
  // `fire_id` -- Unique Firebase ID  <br/>
  // `body`    -- Actual entry text   <br/>
  // `day`     -- Day of the post     <br/>
  // `hour`    -- Hour of the post    <br/>
  // `month`   -- Month of the post   <br/>
  entryTable =  "CREATE TABLE IF NOT EXISTS entry (" +
                  "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                  "fb_id TEXT, " +
                  "body TEXT, " +
                  "day INTEGER, " +
                  "hour INTEGER, " +
                  "month INTEGER" +
                "); ";

  // **tag**                              <br/>
  // `id`       -- Unique ID              <br/>
  // `fire_id`  -- Unique Firebase ID     <br/>
  // `entry_id` -- FK References Entry.id <br/>
  // `name`     -- Tag name               <br/>
  tagTable = "CREATE TABLE IF NOT EXISTS tag (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "fb_id TEXT, " +
                "entry_id TEXT, " +
                "name TEXT, " +
                "FOREIGN KEY(entry_id) REFERENCES entry(id) " +
              ");";
  // Wrap these database actions in a promise to then-ify it
  new Promise(function(resolve, reject) {
    db.serialize(function() {
      db.run(entryTable);
      db.run(tagTable);
      resolve();
    });
  })
  .then(function() {
    return db;
  })
}


/* ----------------------------------------------------- */
// ###insertEntry
//
// Insert a record into the `entry` table
//
// If no sqlite `db` instance is passed, it defaults to opening
// the `db` specified in the config file.
// If no callback or `cb` object is passed, it will be
// converted into a `noop` and output will be suppressed.
function insertEntry(db, fb_id, body, day, hour, month, cb) {
  var insertStatement;

  if (!db)
    db = getDb();
  // If no `cb` or callback object is passed - or if the `cb`
  // object passed isn't a function, set the `cb` object to
  // a noop, or `function(){}`
  if (cb || typeof cb !== "function") {
    cb = noop;
  }

  insertStatement = db.prepare('INSERT INTO ENTRY (fb_id, body, day, hour, month) ' +
                               'VALUES (?, ?, ?, ?, ?)');

  insertStatement.run(fb_id, body, day, hour, month, cb);
}



/* ----------------------------------------------------- */
// <h3>insertTag</h3>
// -----------
// Insert a tag into the `tag` table
//
// If no sqlite `db` instance is passed, it defaults to opening
// the `db` specified in the config file.
// If no callback or `cb` object is passed, it will be
// converted into a `noop` and output will be suppressed.
function insertTag(db, fb_id, tag_id, name, cb) {
  var insertStatement;

  if (!!db)
    db = getDb();
  // If no `cb` or callback object is passed - or if the `cb`
  // object passed isn't a function, set the `cb` object to
  // a noop, or `function(){}`
  if (!!cb || typeof cb !== "function") {
    cb = noop;
  }

  insertStatement = db.prepare('INSERT INTO TAG (fb_id, entry_id, name) ' +
                               'VALUES (?, ?, ?)');

  insertStatement.run(fb_id, tag_id, name, cb);
}

function searchSentences(word) {
  var db = getDb();

  db.all("SELECT ENTRY.body FROM ENTRY WHERE ENTRY.body LIKE '%"+word+"%';", function(err, rows) {
    if (err) console.log(err);
    rows.forEach(function(row) {
      console.log(terminalFormat(row.body.replace(word, chalk.red(word))) + "\n");
    });
    exitProcess();
  });
}


/**
 * Stupid Helpers
 */
function parseFirebaseToSql() {
  var entryRef    = new Firebase(config.entriesV2)
    , tagRef      = new Firebase(config.firebaseV2 + '/tag_index/')
    , entryString = "INSERT INTO ENTRY (fb_id, body, day, hour, month) VALUES " +
                    "(\"%s\", \"%s\", \"%s\", \"%s\", \"%s\")"
    , tagString   = "INSERT INTO TAG (fb_id, entry_id, name) VALUES " +
                    "(\"%s\", \"%s\", \"%s\")"
    , entryId
    , data;


  entryRef.once('value', function(entries) {
    entries.forEach(function(entry) {
      data = entry.val();
      data.body = data.body.replace('\n', '');
      console.log(util.format(entryString, entry.name(), data.body, data.day, data.hour, data.month));
    });
  });

  tagRef.once('value', function(tags) {
    tags.forEach(function(tag) {
      entryId = tag.name();
      _.each(tag.val(), function(tagId, tagName, x) {
        console.log(util.format(tagString, tagId, entryId, tagName));
      });
    });
  });
}



/* ----------------------------------------------------- */
module.exports = {
  create: createDb,
  insertEntry: insertEntry,
  insertTag: insertTag,
  searchSentences: searchSentences,
  getDb: getDb
}