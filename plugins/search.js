commands.info = {
  name: 'Search',
  doc: 'Popular search sites.',
  author: 'Jarvis'
};

function shortcut(phrase, doc, url) {
  commands.add({
    doc: doc,
    phrase: phrase,
    action: function(query) {
      return url.replace(/\$1/, RegExp.$1);
    }
  });
}

shortcut('am', 'Search Amazon', 'http://www.amazon.com/s?field-keywords=$1');
shortcut('bi', 'Search Bing', 'http://www.bing.com/search?q=$1');
shortcut('go', 'Search Google', 'http://www.google.com/search?q=$1');
shortcut('wi', 'Search Wikipedia', 'http://en.wikipedia.org/wiki/$1');
shortcut('ya', 'Search Yahoo!', 'http://search.yahoo.com/search?p=$1');
