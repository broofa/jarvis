var fs = require('fs');
var path = require('path');
var _ = require('underscore');

var request = require('request');
var xml2js = require('xml2js');

var cmds = commands;  // Cache this, because it gets reset by Jarvis
cmds.info = {
  name: 'Search',
  doc: 'Search sites.',
  author: 'Jarvis'
};

/**
 * Utility function to flatten the results of xml2js's parser, to make it easier to work with
 */
function flattenXML(o, k) {
  var v = k != null ? o[k] : o;

  if (k == '@') { // ['@'] -> $(attribute name)
    for (var att in v) o['$' + att] = v[att];
    delete o['@'];
  } else if (k == '#') { // ['#'] -> $
    o.$ = v;
    delete o['#'];
  } else if (v && typeof(v) == 'object') {
    if (v.concat && v.length) {
      for (var i = 0; i < v.length; i++) flattenXML(v,  i);
    } else {
      for (var i in v) flattenXML(v,  i);
    }
  }

  return o;
}

/**
 * Site provides an API for working with OpenSearch site specifications
 */
function Site() {
}

_.extend(Site, {
  fromFile: function(path) {
    var site = new Site();
    fs.readFile(path, 'utf8', function(err, content) {
      if (err) throw error;
      site._parse(content, Site.add);
    });
  },

  fromUrl: function(url) {
    var site = new Site();
    request(url, function(err, res, content) {
      if (err) throw error;
      site._parse(content, Site.add);
    });
  },

  add: function(err, site) {
    var phrase = site.getName().substr(0,2).toLowerCase();

    cmds.add({
      phrase: phrase,
      doc: site.getDescription(),
      action: site.getQueryUrl.bind(site),
      suggest: site.getSuggestUrl.bind(site)
    });
  },

  prototype: {
    _name: 'loading',
    _description: 'OpenSearch schema not yet loaded',

    _parse: function(xml, callback) {
      // handle result
      var parser = new xml2js.Parser();
      parser.addListener('end',
        function(obj) {
          flattenXML(obj);

          // Cache name + description
          this._name = obj.ShortName;
          this._description = obj.Description;
          this._image = obj.Image && obj.Image.$;

          // Cache query string template
          var urls = obj.Url;
          urls = _.isArray(urls) ? urls : [urls];
          _.each(urls, function(url) {
            // Create the url template
            var template = url.$template;

            // Add parameters (if defined)
            if (url.Param) {
              var params = _.isArray(url.Param) ? url.Param : [url.Param];
              params = _.map(params, function(p) {
                return p.$name + '=' + p.$value;
              });

              template = template + '?' + params.join('&');
            }

            // What's it a template for?
            if (url.$type == 'text/html') {
              this._queryUrl = template;
            } else if (url.$type == 'application/x-suggestions+json') {
              this._suggestUrl = template;
            }
          }.bind(this));

          callback(null, this);
        }.bind(this)
      );
      parser.parseString(xml);
    },

    getName: function() {
      return this._name;
    },

    getDescription: function() {
      return this._description;
    },

    getQueryUrl: function(query) {
      return this._queryUrl && this._queryUrl.replace(/{[^}]*}/g,
        function(term) {
          return term == '{searchTerms}' ? query : '';
        }
      );
    },

    getSuggestUrl: function(query) {
      return this._suggestUrl && this._suggestUrl.replace(/{[^}]*}/g,
        function(term) {
          return term == '{searchTerms}' ? query : '';
        }
      );
    }
  }
});

// Build commands for the search sites in the OPENSEARCH dir
var files = fs.readdirSync(OPENSEARCH);
files.forEach(function(file) {
  if (/\.xml$/.test(file)) {
    var filepath = path.join(OPENSEARCH, file);
    Site.fromFile(filepath);
  }
});

