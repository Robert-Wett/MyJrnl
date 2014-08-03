var chalk = require('chalk')
  , size  = require('window-size')
  , _     = require('underscore');

// Callback function to close out the node process
var exitProcess = function(err) {
  if (err) {
    console.log("Woops - ", err);
    process.exit(0);
  } else {
    process.exit(1);
  }
}

/**
 * Checks if the entry contains a valid imgur (DIRECT) link. Returns the
 * link if it does, otherwise a blank string. The angular front-end displays
 * the link if and only if the 'entry.media' entry isn't a blank string.
 */
function getMediaLink(line) {
  var regex = /http:\/\/i\.imgur\.com\/[a-z0-9]{7}\.[gif|png|jpg|jpeg]{3,4}/i
    , result = line.match(regex);

  if (!!result)
    return result[0];

  return '';
}

/**
 * Helper method that returns the proper dimensions for the CLI-Table
 * based on the current TTY window size as the command was issued.
 */
function computeTableSize() {
  var width  = size.width;

  if (width < 80) {
    // Super small, dis-regard the dates
    return [false, width];
  } else {
    // 9 seems to be the magic number to format
    // longer date names, like September.
    return [9, width - 14];
  }
}


/**
 * Takes a long sentence and returns one formatted to fit
 * within the current terminal size.
 */
function terminalFormat(sentence, width) {
  var formattedSentence = []
    , count             = 0;

  width = width || 60;

  _.each(sentence.split(' '), function(word) {
    // Add highlighting to tag words
    if (word[0] === '@' && word[0] !== "undefined") {
      word = chalk.bold.underline(word);
    }

    if (count + word.length > width) {
      formattedSentence.push('\n' + word);
      count = 0;
    } else {
      formattedSentence.push(word);
      count += word.length + 1;
    }
  });

  return formattedSentence.join(" ");
}
exports = {
  computeTableSize: computeTableSize,
  terminalFormat:   terminalFormat,
  getMediaLink:     getMediaLink,
  exitProcess:      exitProcess
}