var search = {
  // TODO: This data structure should be modeled (or read directly from?) the
  // OpenSearch schema
  ENGINES: {
    amazon: {
      name: 'Amazon',
      url: 'http://www.amazon.com/s?field-keywords=%s'
    },
    google: {
      name: 'Google',
      url: 'http://www.google.com/search?q=%s'
    },
    bing: {
      name: 'Bing',
      url: 'http://www.bing.com/search?setmkt=en-US&q=%s'
    },
    wikipedia: {
      name: 'Wikipedia',
      url: 'http://en.wikipedia.org/wiki/%s'
    },
    yahoo: {
      name: 'Yahoo!',
      url: 'http://search.yahoo.com/search?ei={inputEncoding}&fr=crmas&p=%s'
    }
  },

  DEFAULT_ENGINE: 'google',

  getQueryURL: function(engine, q) {
    // Handle jarvis shortcuts
    // TODO: Move this into a separate command
    if (/^(jarvis|J)$/.test(q)) {
      return '/';
    }

    // Get engine info
    engine = this.ENGINES[engine] || this.ENGINES[this.DEFAULT_ENGINE];

    var url = engine.url;
    return url.replace(/%s/, q);
  }
}

module.exports = search;
