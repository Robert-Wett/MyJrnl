var chalk           = require('chalk')
  , Size            = require('window-size')
  , _               = require('underscore')
  // Defines the length of the Month/Day column
  , monthColLength  = 11
  // Defines the length of the terminal width that will
  // allow displaying the date nicely
  , doubleColLength = 60
  // Defines the right-padding at the end of the entry to the terminal
  , rightPadding    = 15;

/**
 * Callback function to close out the node process
 *
 * If an `err` object is passed, it prints out the error message and exits
 * with a `1` for the failure code. If no `err` object is passed, then it's
 * assumed that the process was completed successfully and exits with `0` for
 * the success code.
 */
var exitProcess = function(err) {
  if (err) {
    console.log("Error: ", err);
    process.exit(1);
  } else {
    process.exit(0);
  }
};

/**
 * Checks if the entry contains a valid imgur (DIRECT) link. Returns the
 * link if it does, otherwise a blank string. The angular front-end displays
 * the link if and only if the 'entry.media' entry isn't a blank string.
 */
function getMediaLink(line) {
  var regex = /http:\/\/i\.imgur\.com\/[a-z0-9]{7}\.[gif|png|jpg|jpeg|gifv]{3,4}/i
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
  var width  = Size.width;

  /**
   * Using the PEP standard of 80 seems too long...
   * maybe it's my off-brand 4K monitor throwing me off
   */
  if (width < doubleColLength) {
    // Super small, dis-regard the dates
    return [false, width];
  } else {
    return [monthColLength, width - rightPadding];
  }
}

/**
 * POJO that defines table-styling. The two major properties we are defining here
 * are `chars` and `style`, because they are the defineable properties in the
 * included NPM module `cli-table`.
 */
var tableStyling = {
  normal: {
    chars: {
      'top':    '_', 'top-mid':    '|', 'top-left':    '|', 'top-right':    '|',
      'bottom': '_', 'bottom-mid': '|', 'bottom-left': '|', 'bottom-right': '|',
      'left':   '|', 'left-mid':   '|', 'mid':         '_', 'mid-mid':      '|',
      'right':  '|', 'right-mid':  '|', 'middle':      '│'
    },
    style: {}
  },
  minimal: {
    chars: {
        'top':    '', 'top-mid':    '', 'top-left':    '', 'top-right':    '',
        'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
        'left':   '', 'left-mid':   '', 'mid':         '', 'mid-mid':      '',
        'right':  '', 'right-mid':  '', 'middle':      '|'
    },
    style: {
      'padding-left': 0,
      'padding-right': 0
    }
  },
  bare: {
    chars: {
      'top':    '', 'top-mid':    '', 'top-left':    '', 'top-right':    '',
      'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
      'left':   '', 'left-mid':   '', 'mid':         '', 'mid-mid':      '',
      'right':  '', 'right-mid':  '', 'middle':      ' '
    },
    style: {
      'padding-left': 0,
      'padding-right': 0
    }
  }
};


/**
 * Takes a long sentence and returns one formatted to fit
 * within the current terminal size.
 */
function terminalFormat(sentence, width) {
  var formattedSentence = []
    , count             = 0;

  width = width || Size.width;

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

function validateInputAmount(amount) {
  // Nothing was passed or what was passed was NaN
  if (typeof amount !== 'number' && amount !== null) {
    return [null, null];
  }
  // A negative number was passed. Send back error message
  else if (amount < 0) {
    return ["Please enter a positive number!"];
  }
  // Looks good
  else {
    return [null, parseFloat(amount)];
  }
}


module.exports = {
  validateInputAmount: validateInputAmount,
  computeTableSize:    computeTableSize,
  terminalFormat:      terminalFormat,
  getMediaLink:        getMediaLink,
  exitProcess:         exitProcess,
  tableStyle:          tableStyling,
  noop:                function(){}
};