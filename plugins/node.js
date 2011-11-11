// Fetch and parse the all.html page to generate a list of suggested completions
var request = require('request');

commands.info = {
  name: 'Node.js',
  doc: 'Shortcuts for node.js developers',
  author: 'Jarvis'
};

/**
 * Takes a command, fetches the 'action' url, parses it for anchor links
 * ('#..'), adds those as suggestions for the command, and registers it.
 */
function addNodeCommand(options) {
  // Cache a reference to this because the global is blown away once the module
  // is loaded
  var cmds = commands;

return cmds.add(options);

  request(options.action, function(err, res, body) {
    if (err) throw err;

    var suggestions = [];
    body.replace(/href="#([^"]+)"/g, function(match, capture) {
      suggestions.push(capture);
    });
    options.suggest = function() {
      return suggestions;
    }
    cmds.add(options);
  });
}

addNodeCommand({
  doc: 'Node.js v0.4 docs',
  phrase: 'n4',
  action: 'http://nodejs.org/docs/v0.4.12/api/all.html'
});

addNodeCommand({
  doc: 'Node.js v0.5 docs',
  phrase: 'n5',
  action: 'http://nodejs.org/docs/v0.5.6/api/all.html'
});
