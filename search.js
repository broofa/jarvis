module.exports = {
  ENGINES: {
    google: {
      name: 'Google',
      url: 'http://www.google.com/search?q=%s'
    },
    bing: {
      name: 'Bing',
      url: 'http://www.bing.com/search?setmkt=en-US&q=%s'
    },
    yahoo: {
      name: 'Yahoo!',
      url: 'http://search.yahoo.com/search?ei={inputEncoding}&fr=crmas&p=%s'
    }
  },

  getQueryURL: function(engine, q) {
    // Handle jarvis shortcuts
    // TODO: Move this into a separate command
    if (/^(jarvis|J)$/.test(q)) {
      return '/';
    }

    engine = this.ENGINES[engine];

    if (!engine) {
      return null;
    }

    var url = engine.url;
    return url.replace(/%s/, q);
  }
}
