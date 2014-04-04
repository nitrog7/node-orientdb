'use strict';

var Statement = require('./statement'),
  _ = require('lodash');

module.exports = exports = Statement.extend({
  one: function(params) {
    if(params) {
      this.addParams(params);
    }

    return this.exec().then(function(results) {
        return results[0];
      });
  },
  all: function(params) {
    if(params) {
      this.addParams(params);
    }

    return this.exec();
  },
  scalar: function(params) {
    if(params) {
      this.addParams(params);
    }

    return this.exec().then(function(response) {
        var key;
        response = response[0];
        if(response && _.isObject(response)) {
          key = Object.keys(response).filter(function(item) {
            return item[0] !== '@';
          })[0];

          if(key) {
            return response[key];
          }
        }
        return response;
      });
  },
  exec: function(params) {
    if(params) {
      this.addParams(params);
    }

    return this.db.query(this.buildStatement(), this.buildOptions());
  }
});