/**
 * 'command' manages the set of available commands, and provides the
 * logic for interpreting a query.
 */
var _ = require('./underscore'),
    search = require('./search');

function CommandGroup(name, options) {
  this.options = options;
  this.commands = [];
}

_.extend(CommandGroup, {
  prototype: {
    add: function(cmd) {
      // If no match regex provided, construct one
      if (!cmd.match) {
        cmd.doc = '<b>' + cmd.phrase + '</b> &rarr; ' + cmd.doc;
        cmd.match = new RegExp('^' + cmd.phrase + '(?:\\s+|$)');
      }

      // Create action for a static url if provided
      if (typeof(cmd.action) == 'string') {
        var url = cmd.action;
        cmd.action = function() {
          return url;
        }
      }

      this.cmd = cmd;

      this.commands.push(cmd);

      return this;
    }
  }
});

var command = {
  /**
   * List of available commands
   */
  list: [],

  groups: {},

  group: function(name, options) {
    var group = this.groups[name];
    if (!group) {
      group = new CommandGroup(name, options);
      this.groups[name] = group;
    }
    return group;
  },

  /**
   * Process a search request, returning the URL to redirect to
   */
  process: function(req) {
    var cmd;

    // Get query
    var q = req.query.q;

    // Default phrase (which defaults to google)
    var defPhrase = req.cookies.d || 'go';

    // Find the command to handle this request
    _.any(this.groups, function(group, name) {
      return _.any(group.commands, function(c) {
        if (c.match.test(q)) {
          // Command matches
          cmd = c;
          return true;
        } else if (defPhrase && defPhrase == c.phrase) {
          // The default command (set it in case we fail to find a match)
          cmd = c;
        }
        return false;
      });
    });

    return cmd && cmd.action(q);
  }
};

// Add the jarvis (J) command to get to the home page
command.group('Jarvis')
  .add({
    doc: 'Go to Jarvis home page',
    phrase: 'jarvis',
    action: '/'
  })

command.group('Node.js')
  .add({
    doc: 'Node.js v0.4 docs',
    phrase: 'n4',
    action: 'http://nodejs.org/docs/v0.4.11/api/all.html'
  })
  .add({
    doc: 'Node.js v0.5 docs',
    phrase: 'n5',
    action: 'http://nodejs.org/docs/v0.5.6/api/all.html'
  });

// Add search engine options
var group = command.group('Search');
Object.keys(search.ENGINES).sort().forEach(function(k) {
  var engine = search.ENGINES[k];
  var phrase = k.substr(0,2).toLowerCase();
  group.add({
    doc: 'Search ' + engine.name + ' (e.g. "' + phrase + ' camera")',
    phrase: phrase,
    action: function(query) {
      query = query.replace(this.match, '');
      return search.getQueryURL(k, query);
    }
  });
});

module.exports = command;
