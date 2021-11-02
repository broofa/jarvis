/**
 * 'command' manages the set of available commands, and provides the
 * logic for interpreting a query.
 */
var fs = require('fs');
var path = require('path');
var request = require('request');
var xml2js = require('xml2js');

var _ = require('./underscore');

/**
 * CommandSet instances are the API thru which new commands are created, and are
 * the context in which plugins are sandboxed.
 */
function CommandSet() {
  this.commands = [];
  this.add = this.add.bind(this);
}

_.extend(CommandSet, {
  prototype: {
    add: function(options) {
      // Create action for a static url if provided
      if (typeof(options.action) == 'string') {
        var url = options.action;
        options.action = function() {
          return url;
        };
      }

      // Coerce phrase into an array
      if (!options.phrase.forEach) {
        options.phrase = [options.phrase];
      }

      // Add commands and aliases
      var phrase = options.phrase[0];
      options.phrase.forEach(
        function(c, i) {
          var cmdCopy = _.extend({}, options);

          cmdCopy.phrase = c;

          // If no match regex provided, construct one
          if (!cmdCopy.match) {
            cmdCopy.match = new RegExp('^' + cmdCopy.phrase + '(?:\\s+(.*))?$');
          }

          if (i > 0) {
            cmdCopy.doc = 'See "' + phrase + '"';
          }
          this.commands.push(cmdCopy);
        }, this
      );
    }
  }
});

global.command = module.exports = {
  /**
   * List of available commands
   */
  commandSets: [],

  /**
   * Load plugins from the specified directory
   *
   * Plugins are _not_ modules.  They are eval'ed in a (mostly) barren sandbox
   * that prevents them from calling into any of the built-in node.js APIs.  We
   * do this because (eventually) we want to support user-generated plugins,
   * and will have to guard against malicious code.
   */
  loadPlugins: function(dir) {
    var files = fs.readdirSync(dir);

    files.forEach(function(file) {
      var plugin = path.join(dir, file);
      if (/\.js$/.test(plugin) || fs.statSync(plugin).isDirectory()) {
        // Note: 'Much as we'd love to have some sort of secure plugin loader
        // here to allow scripts to run in a sandbox, it just doesn't exist.
        // (runIn*Context is not secure).  We'd also like to provide some nice
        // conveniences for plugins (e.g automatically making the commands
        // module available to them), but dicking around with runIn*Context
        // just doesn't work as well as using the built-in require mechanism.
        // E.g. stack traces in exceptions aren't as informative.  So require()
        // is what we're going with for now.

        global.commands = new CommandSet();
        require(plugin);
        this.commandSets.push(global.commands);
        global.commands.commands.sort(function(a, b) {
          a = a.phrase;
          b = b.phrase;
          return a < b ? -1 : (a > b ? 1 : 0);
        });
        delete global.commands;
      }
    }, this);

    this.commandSets.sort(function(a, b) {
      a = a.name;
      b = b.name;
      return a < b ? -1 : (a > b ? 1 : 0);
    });
  },

  /**
   * apply a function to each registered command
   */
  eachCommand: function(f) {
    for (var i = 0, ii = this.commandSets.length; i < ii; i++) {
      var commandSet = this.commandSets[i];
      for (var j = 0, jj = commandSet.commands.length; j < jj; j++) {
        f(commandSet.commands[j]);
      }
    }
  },

  /**
   * Extract the query from a request and return the appropriate command object
   * for processing it
   */
  matchRequest: function(req) {
    return this.matchPhrase(req.query.q, req.cookies.d || 'go');
  },

  /**
   * Return the first command that matches the query, or return the default command
   */
  matchPhrase: function(phrase, defaultPhrase) {
    phrase = phrase || false;
    defaultPhrase = defaultPhrase || 'go';

    var command, defaultCommand;
    this.eachCommand(function(cmd) {
        if (phrase && cmd.match.test(phrase)) {
          command = cmd;
        } else if (defaultPhrase && cmd.match.test(defaultPhrase)) {
          defaultCommand = cmd;
        }
    });

    command = command || defaultCommand;

    // Get the current query portion of, uh, the query, as identified by the
    // command regex
    command.match.test(phrase);
    this.currentQuery = command.match.test(phrase) && RegExp.$1;

    return command;
  }
};
