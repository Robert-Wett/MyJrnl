#journal-cli

#####write random things, thoughts, blogs, or whatever with the CLI app backed by firebase with an angular front-end, inspired by [jrnl](http://maebert.github.io/jrnl/). Because there's no backend needed, you can host this on the github project page [as I do here](http://robert-wett.github.io/journal). One of the main objectives of this project is to create a rich experience without having to run any servers. All actions are first backed by a sqlite db, then persisted to a firebase store. At this time, firebase doesn't support a text-search so you have to pull down the entire collection and iterate through them which isn't super performant, especially at scale. This is a work in progress!
======



####Some screenshots/examples
#####Basic Usage

![Basic usage](https://raw.githubusercontent.com/Robert-Wett/journal/master/img/journal-cli.gif)
<br>
#####CLI Stuff
![CLI stuff](https://raw.githubusercontent.com/Robert-Wett/journal/master/img/journal-cli2.gif)
