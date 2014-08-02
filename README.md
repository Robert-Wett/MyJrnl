#journal-cli
======

CLI app backed by cloud storage and a web front-end, inspired by [jrnl](http://maebert.github.io/jrnl/)

This data syncs to a firebase store, and is available in a real-time feed [here](http://robert-wett.github.io/journal). This is under heavy construction!


###TODO://
 * Write to local sqlite db -> write to firebase
 * Completely flatten firebase schema to single-level collections. Use sqlite db to store pointers to data in firebase negate any un-necessary FB actions.
     * Will need a linking collection on firebase's side, which will again be a single-level collection

##Some screenshots/examples
####Basic Usage

![Basic usage](https://raw.githubusercontent.com/Robert-Wett/journal/master/img/journal-cli.gif)

![CLI stuff](https://raw.githubusercontent.com/Robert-Wett/journal/master/img/journal-cli2.gif)
