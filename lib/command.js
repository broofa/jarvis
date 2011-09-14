/**
 * 'command' manages the set of available commands, and provides the
 * logic for interpreting a query.
 */
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var _ = require('./underscore');
var command = require('./command');

/**
 * CommandSet instances are the API thru which new commands are created, and are
 * the context in which plugins are sandboxed.

 * IMPORTANT: Be very careful about what functionality is exposed here! Assume
 * malicious scripts will be trying to fuck things up by calling into this API.
 */
function CommandSet() {
  this.commands = [];
  this.add = function(cmd) {
    // Create action for a static url if provided
    if (typeof(cmd.action) == 'string') {
      var url = cmd.action;
      cmd.action = function() {
        return url;
      }
    }

    // Coerce phrase into an array
    if (!cmd.phrase.forEach) {
      cmd.phrase = [cmd.phrase];
    }

    // Add commands and aliases
    var phrase = cmd.phrase[0];
    cmd.phrase.forEach(function(c, i) {
      var cmdCopy = _.extend({}, cmd);

      cmdCopy.phrase = c;

      // If no match regex provided, construct one
      if (!cmdCopy.match) {
        cmdCopy.match = new RegExp('^' + cmdCopy.phrase + '(?:\\s+|$)');
      }

      cmdCopy.doc = '<b>' + cmdCopy.phrase + '</b> ' + (i <= 0 ? cmdCopy.doc :
                    ('(alias for <b>' + phrase + '</b>)'));
      this.commands.push(cmdCopy);
    }, this);
  }.bind(this);
}

module.exports = {
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
      if (/.js$/.test(file)) {
        var scriptPath = path.join(dir, file);
        console.log('Loading Jarvis plugin ' + scriptPath);
        var js = fs.readFileSync(scriptPath, 'utf8');

        // Run the script.  Although we'd really like run this in a new context
        // to properly sandbox the plugin code, runInNewContext() is known to
        // be insecure.  So instead of conveying a false sense of security, we
        // drop all pretense of this being a secure method for running scripts.
        // Plugins have the keys to the kingdom and people should be informed
        // of such, and act accordingly.  And since that's just the way it is,
        // we use runInThisContext, which makes debugging a lot easier.
        var commands = new CommandSet();
        global.commands = commands;
        vm.runInThisContext(js, scriptPath);
        delete global.commands;

        this.commandSets.push(commands);
      }
    }, this);

    this.commandSets.sort(function(a, b) {
      a = a.name;
      b = b.name;
      return a < b ? -1 : (a > b ? 1 : 0);
    });
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
    _.any(this.commandSets, function(group, name) {
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
