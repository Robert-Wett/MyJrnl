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


// ###getDb
// Get a reference to a sqlite3 database at the speficied path.
// The default value is OPEN_READWRITE | OPEN_CREATE
function getDb(path) {
  var db;

  path = path || config.dbPath2;
  db   = new sqlite3.Database(path);
  return db;
}

// ###getDbWithPromise
// Get a reference to a sqlite3 database at the speficied path.
// The default value is OPEN_READWRITE | OPEN_CREATE, and this
// returns a `Promise` object.
function getDbWithPromise(path) {
  var db;

  path = path || config.dbPath2;
  return new Promise(function(reject, resolve) {
    db   = new sqlite3.Database(path);
    resolve(db);
  });
}

// ###createDb
// Builds the sqlite database if it doesn't already exist.
function createDb() {
  var entryTable
    , tagTable
    , db;

  db = getDb();

  // **entry**                        <br/>
  // `id`      -- Unique ID           <br/>
  // `fire_id` -- Unique Firebase ID  <br/>
  // `body`    -- Actual entry text   <br/>
  // `day`     -- Day of the post     <br/>
  // `hour`    -- Hour of the post    <br/>
  // `month`   -- Month of the post   <br/>
  entryTable = "CREATE TABLE IF NOT EXISTS entry (" +
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

  /**
   *  Serialize the two table creation statements to make sure they are run
   *  before returning a reference to the `db`. Notice in the creation statements
   *  that the `IF NOT EXISTS` notation is used, so it skips this step and just
   *  returns the ref to the `db` if it's already created.
   */
  return new Promise(function(resolve, reject) {
    db.serialize(function() {
      db.run(entryTable);
      db.run(tagTable);
      resolve(db);
    });
  });
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
  // If no `cb` or callback object is passed - or if the `cb`
  // object passed isn't a function, set the `cb` object to
  // a noop, or `function(){}`
  if (typeof cb !== "function" && cb !== null) {
    cb = noop;
  }

  if (typeof db !== "undefined" && db !== null) {
    db = createDb(cb)
    .then(function(db) {
      addEntryToDb(db, fb_id, body, day, hour, month, cb);
    });
  } else {
      addEntryToDb(db, fb_id, body, day, hour, month, cb);
  }
}

/* ----------------------------------------------------- */
// <h3>addEntryToDb</h3>
// -----------
// Takes a reference to the sqlite3 DB and adds an entry to
// the `ENTRY` table.
function addEntryToDb(db, fb_id, body, day, hour, month, cb) {
  var insertStatement;

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
  // If no `cb` or callback object is passed - or if the `cb`
  // object passed isn't a function, set the `cb` object to
  // a noop, or `function(){}`
  if (typeof cb !== "function" && cb !== null) {
    cb = noop;
  }

  if (typeof db !== "undefined" && db !== null) {
    db = createDb(cb)
    .then(function(db) {
      addTagToDb(db, fb_id, tag_id, name, cb);
    });
  } else {
      addTagToDb(db, fb_id, tag_id, name, cb);
  }
}

/* ----------------------------------------------------- */
// <h3>addTagToDb</h3>
// -----------
// Takes a reference to the sqlite3 DB and adds an entry to
// the `TAG` table.
function addTagToDb(db, fb_id, tag_id, name, cb) {
  var insertStatement;

  insertStatement = db.prepare('INSERT INTO TAG (fb_id, entry_id, name) ' +
                               'VALUES (?, ?, ?)');

  insertStatement.run(fb_id, tag_id, name, cb);
}

function searchSentences(word) {
  var db = getDb();

  db.all("SELECT ENTRY.body FROM ENTRY WHERE ENTRY.body LIKE '%"+word+"%';", function(err, rows) {
    if (err) {
      if (err.errno === 1) {
        // Table doesn't exist. We create the table silently and just return.
        console.log("Nothing found (your local DB is empty!)");
      } else {
        exitProcess(err);
      }
    } else if (rows.length > 0) {
      rows.forEach(function(row) {
        console.log(terminalFormat(row.body.replace(word, chalk.red(word))) + "\n");
      });
      exitProcess();
    } else {
      console.log("Nothing found!");
    }
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
    , entryList   = []
    , tagList     = []
    , entryId
    , data
    , db          = getDb();


  db.all("SELECT fb_id FROM ENTRY", function(err, rows) {
    if (err) {
      exitProcess(err);
    }
    else {
      _.each(rows, function(row) {
        entryList.push(row.fb_id);
      });
    }

    db.all("SELECT fb_id FROM TAG", function(err, rows) {
      if (err) {
        exitProcess(err);
      }
      else {
        _.each(rows, function(row) {
          tagList.push(row.fb_id);
        });
      }
    });
  });

  entryRef.once('value', function(entries) {
    entries.forEach(function(entry) {
      data = entry.val();
      data.body = data.body.replace('\n', '');
      if (_.contains(entryList, entry.key())) {
        console.log(util.format("OK, we've got this entry: '%s'",
                                data.body));
      }
      else {
        console.log(util.format("We need to add the entry '%s'\n'%s'",
                                entry.key(),
                                data.body));
      //console.log(util.format(entryString, entry.key(), data.body, data.day, data.hour, data.month));
      }
    });
  });

  tagRef.once('value', function(tags) {
    tags.forEach(function(tag) {
      entryId = tag.key();
      _.each(tag.val(), function(tagId, tagName) {
        console.log("Tagname:", tagName);
        if (_.contains(tagList, tagName)) {
          console.log("OK, we've got this tag");
        }
        else {
          console.log(util.format("We need to add the tag %s",
                                     tagName));
        }
      });
    });
  });

}



/* ----------------------------------------------------- */
module.exports = {
  createDb: createDb,
  insertEntry: insertEntry,
  insertTag: insertTag,
  searchSentences: searchSentences,
  getDb: getDb,
  parseFirebaseToSql: parseFirebaseToSql
};
