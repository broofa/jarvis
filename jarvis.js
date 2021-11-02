/**
 * Module dependencies.
 */

var express = require('express'),
    path = require('path'),
    command = require('./lib/command')

var app = module.exports = express.createServer();

// Publish env constants
global.PLUGINS = __dirname + '/plugins';
global.OPENSEARCH = __dirname + '/opensearch';
global.requirePlugin = function(plugin) {
  return require(path.join(PLUGINS, plugin));
}

// Configuration

function userParser(req, res, next) {
  req.user = {
    engine: req.cookies.engine || 'google'
  };
  next();
}

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.logger({format: 'dev'}));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(userParser);
  app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function() {
  app.use(express.errorHandler());
});

// Routes

app.get('/', function(req, res) {
  res.render('index', {
    user: req.user,
    command: command,
    defaultCommand: req.cookies.d
  });
});

/**
 * Handle search queries.
 */
app.get('/search', function(req, res) {
  // Find any matching command (falling back to whatever the user has selected
  // for their default command)
  var phrase = req.query.q;
debugger;
  var cmd = command.matchPhrase(phrase, req.cookies.d || 'go');

  // No command? This should never happen since it means we failed to do
  // anything useful for the user
  if (!cmd) {
    return res.render('error', {
      message: 'Bizarre... couldn\'t find any command for your query'
    });
  }

  // Redirect to the command-supplied url
  var url = cmd && cmd.action(command.currentQuery);
  if (!url) {
    return res.render('error', {
      message: 'The ' + cmd.phrase + ' command is confused by "' + phrase + '"'
    });
  }
  res.redirect(url);
});

/**
 * Handle OpenSearch queries from user agents.  See
 * http://www.opensearch.org/Specifications/OpenSearch/Extensions/Suggestions/1.1#Response_format
 */
app.get('/suggest', function(req, res) {
  var phrase = req.query.q;
  var cmd = command.matchPhrase(phrase, req.cookies.d || 'go');

  // command objects just need to return a list of suggested words.  We handle
  // bundling it on proper OpenSearch format
  var results = cmd && cmd.suggest && cmd.suggest(phrase);
  if (!results) {
    res.writeHead(204);
    res.end;
  } else if (typeof(results) == 'string') {
    res.redirect(results);
  } else {
    var query = (command.currentQuery || '').toLowerCase();
    // TODO: First pass at returning relevant results. Lots of room for
    // improvement.
    results.sort(function(a, b) {
      a = a.toLowerCase().indexOf(query);
      b = b.toLowerCase().indexOf(query);
      a = a == -1 ? 999 : a;
      b = b == -1 ? 999 : b;
      return a < b ? -1 : (a > b ? 1 : 0);
    });

    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify([phrase, results.slice(0,10)]));
  }
});

command.loadPlugins(path.join(__dirname, 'plugins'));

app.listen(3000);
console.log("Jarvis listening on port %d in %s mode", app.address().port, app.settings.env);
