var sqlite3 = require('sqlite3')
  , promise = require('Promise')
  , config  = require('../config.js').config
  , noop    = require('./helpers.js').noop;


/*
entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT -- Unique ID
  fire_id TEXT                         -- Unique Firebase ID
  body TEXT                            -- Actual entry text
  day INTEGER                          -- Day of the post
  hour INTEGER                         -- Hour of the post
  month INTEGER                        -- Month of the post
)

tag (
  id INTEGER PRIMARY KEY AUTOINCREMENT -- Unique ID
  fire_id TEXT                         -- Unique Firebase ID
  entry_id INTEGER                     -- FK References Entry.id
  name  TEXT                           -- Tag name
)
*/
function createDb(db, callback) {
  var entryTable
    , _promise
    , tagTable;

  db       = db       || new sqlite3.Database(config.dbPath);
  callback = callback || noop

  entryTable =  "CREATE TABLE IF NOT EXISTS entry (" +
                  "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                  "fb_id TEXT, " +
                  "body TEXT, " +
                  "day INTEGER, " +
                  "hour INTEGER, " +
                  "month INTEGER" +
                "); ";

  tagTable = "CREATE TABLE IF NOT EXISTS tag (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "fb_id TEXT, " +
                "entry_id TEXT, " +
                "name TEXT, " +
                "FOREIGN KEY(entry_id) REFERENCES entry(id) " +
              ");";

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

module.exports = {
  create: createDb
}