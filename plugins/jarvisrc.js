/*
Jarvis BOOKMARKS file
- Must be valid JSON
- Key names are matched in Jarvis
- Values are either Bookmark definitions (objects) or aliases (strings)

BOOKMARKS

Bookmarks are defined as key-value pairs in a JSON object.  The key is the
jarvis phrase the user enters, the value is either a bookmark object, or an
alias string, that refers to another key in the bookmarks file.

For example, a basic bookmark:

  npr: {
    doc: 'Go to the NPR web site'
    url: 'http://npr.org',
  }

A bookmark, with passed arguments as a query string:

  npr_search: {
    doc: 'Search the NPR web site',
    url: 'http://www.npr.org/search/index.php?searchinput={QUERY}'
  }

CONSTANTS

Jarvis ignores any keys that don't resolve to a bookmark command. However they
are available for substitution in urls.

NO ARGS .VS. ARGS

It's not uncommon to want different behavior for a bookmark based on whether or
not the user provides a query string.  In these cases, use the 'url' field for
the no-query case, and the 'query' field for the query case.

TOKEN SUBSTITUTION

Tokens are substituted recursively, until all tokens have been resolved.

ALIASES

Aliases are simple string values that specify which command to run, and may
include the same substitution tokens as the 'url' or 'query' bookmark fields.

Putting all of the above together, we get the following:

  NPR_ROOT: 'http://www.npr.org',
  npr: {
    doc: 'Go to (or search) the NPR web site'
    url: '{NPR_ROOT}',
    query: '{NPR_ROOT}/search/index.php?searchinput={QUERY}'
  },
  public_radio: 'npr {ARGS}',
*/
var fs = require('fs');
var path = require('path');
var _ = require('underscore');

commands.info = {
  name: 'Bookmarks',
  doc: 'Bookmarks defined in ~/.jarvisrc',
  author: 'Jarvis'
};

// Build commands for the search sites in the OPENSEARCH dir
var RC_DIR = path.join(process.env.HOME, '.jarvisrc');
var files = fs.readdirSync(RC_DIR);

// List of sections we lookup keys in.  The placeholder object @i=0 is
// populated (later) with dynamic keys that resolve to ARGS or QUERY
var sections = [{}];

/**
 * Find the first section containing the designated key, with preference given
 * to the section, if specified
 */
function sectionLookup(key, section) {
  if (section && (key in section)) {
    return section;
  }
  for (var i = 0; i < sections.length; i++) {
    var section = sections[i];
    if (key in section) {
      return section;
    }
  }
  return null;
}

// Load each bookmark file as a "section"
files.forEach(function(file) {
  if (/\.json$/.test(file)) {
    var filepath = path.join(RC_DIR, file);
    console.log('Loading bookmarks: ' + filepath);

    var json = fs.readFileSync(filepath, 'utf8');
    section = JSON.parse(json);
    section.__memo = {}; // resolve() memoization cache
    sections.push(section);
  }
});


// Flag for detection circular resolution loops
var RESOLVING = {};

/**
 * Recursive token replacement using
 */
function resolve(val, section, crumbs) {
  crumbs = crumbs || [];
  var cl = crumbs.length;

  return val.replace(/\{([\w$]+)\}/g, function(match) {
    var token = RegExp.$1;

    // Find section for the token
    var tokenSection = sectionLookup(token, section);
    var tokenVal = null;

    if (tokenSection) {
      tokenVal = tokenSection.__memo[token];

      if (tokenVal === RESOLVING) {
        throw new Error('Circular token loop detected: ' + crumbs.join(' > '));
      } else if (tokenVal == null) {
        tokenVal = tokenSection[token];
        /// Value not in cache - resolve it
        tokenSection.__memo[token] = RESOLVING;
        crumbs[cl] = token;
        tokenVal = resolve(tokenVal, tokenSection, crumbs);
        crumbs.length = cl;
        tokenSection.__memo[token] = tokenVal;
      }
    }

    // Substitute the value we foun, or put the the token back
    return tokenVal || '{' + token + '}';
  });
}

function makeAction(options) {
  return function(query) {
    var template = options.query || options.url || options;
    if (typeof(template) != 'string') {
      throw new Error(options + ' does not provide an action template');
    }
    var url = resolve(template).
    replace(/{QUERY}/g, escape(query)).
    replace(/{ARGS}/g, query);

    return url;
  }
}

sections.forEach(function(section) {
  for (var key in section) {
    var val = resolve(key, section);

    var options = section[key];
    if (options && options.url) {
      commands.add({
        phrase: key,
        doc: options.doc,
        action: makeAction(options)
      });
    }
  }
});
