var search = require('./search');

/**
 * The command module is responsible for managing a user's command
 * configuration, and processing search box queries.
 */
var command = {
  // The list of commands for the current user
  list: [],

  // Add a command to the command list
  add: function(command) {
    // Create regex for a static phrase if provided
    if (command.phrase) {
      command.doc = '<b>' + command.phrase + '</b> &rarr; ' + command.doc;
      command.match = new RegExp('^' + command.phrase + '(?:\s+|$)');
    }

    // Create handler for a static url if provided
    if (command.url) {
      var url = command.url;
      command.handler = function() {
        return command.url;
      }
    }

    this.list.push(command);
  },

  // Process a search request, returning the URL to redirect to
  process: function(req) {
    var q = req.query.q;
    this.currentRequest = req;

    var url;
    for (var i = 0; i < this.list.length; i++) {
      var command = this.list[i];
      if (command.match.test(q)) {
        // TODO catch errs in prod to prevent bad command handlers from
        // breaking things
        // TODO make more robust
        url = command.url || command.handler(q);
        break;
      }
    }

    this.currentRequest = null;
    return url;
  }
};

// Add the jarvis (J) command to get to the home page
command.add({
  doc: 'Go to Jarvis home page',
  phrase: 'jarvis',
  url: '/'
});

command.add({
  doc: 'Node.js v0.4 docs',
  phrase: 'n4',
  url: 'http://nodejs.org/docs/v0.4.11/api/'
});

command.add({
  doc: 'Node.js v0.5 docs',
  phrase: 'n5',
  url: 'http://nodejs.org/docs/v0.5.6/api/'
});

// Add the fallback search engine command
Object.keys(search.ENGINES).sort().forEach(function(k) {
  var engine = search.ENGINES[k];
  var phrase = k.substr(0,2).toLowerCase();
  command.add({
    doc: 'Search ' + engine.name + ' (e.g. "' + phrase + ' camera")',
    phrase: phrase,
    handler: function(query) {
      query = query.replace(this.match, '');
      return search.getQueryURL(k, query);
    }
  });
});

command.add({
  doc: '&hellip; everything else goes to your preferred search engine',
  match: /.*/,
  handler: function(query) {
    var engine = command.currentRequest.cookies.engine;
    return search.getQueryURL(engine, query);
  }
});

module.exports = command;
