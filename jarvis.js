/**
 * Module dependencies.
 */

var express = require('express'),
    path = require('path'),
    command = require('./lib/command')

var app = module.exports = express.createServer();

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
    title: 'Jarvis',
    user: req.user,
    command: command,
    defaultCommand: req.cookies.d
  });
});

app.get('/reload', function(req, res) {
  // Force a reload of the plugins
  command.commandSets = [];
  command.loadPlugins(path.join(__dirname, 'plugins'));

  res.redirect('/');
});

app.get('/search', function(req, res) {
  var url = command.process(req);
  if (!url) {
    res.render('error', {
      title: 'Jarvis',
      message: 'Hmm... that command doesn\'t go anywhere'
    });
  } else {
    res.redirect(url);
  }
});

command.loadPlugins(path.join(__dirname, 'plugins'));

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
