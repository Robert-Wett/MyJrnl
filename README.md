#journal-cli

#####write random things, thoughts, blogs, or whatever with the CLI app backed by firebase with an angular front-end, inspired by [jrnl](http://maebert.github.io/jrnl/). Because there's no backend needed, you can host this on the github project page [as I do here](http://robert-wett.github.io/journal). This is a work in progress!
======

###TODO://
 * Write to local sqlite db -> write to firebase
 * Completely flatten firebase schema to single-level collections. Use sqlite db to store pointers to data in firebase negate any un-necessary FB actions.
     * Will need a linking collection on firebase's side, which will again be a single-level collection

####Some screenshots/examples
#####Basic Usage

![Basic usage](https://raw.githubusercontent.com/Robert-Wett/journal/master/img/journal-cli.gif)
<br>
#####CLI Stuff
![CLI stuff](https://raw.githubusercontent.com/Robert-Wett/journal/master/img/journal-cli2.gif)