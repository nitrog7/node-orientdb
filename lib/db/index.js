'use strict';

var utils = require('../utils'),
  errors = require('../errors'),
  Promise = require('bluebird'),
  RID = require('../recordid'),
  Query = require('./query'),
  _ = require('lodash');


/**
 * Database Constructor.
 *
 * @param {Object} config The optional configuration for the database.
 */
function Db(config) {
  if(!config) {
    throw new errors.Config('Database object requires configuration');
  }

  this.configure(config);
  this.init();
  this.augment('cluster', require('./cluster'));
  this.augment('class', require('./class'));
  this.augment('record', require('./record'));
  this.augment('vertex', require('./vertex'));
  this.augment('edge', require('./edge'));
}


Db.prototype.augment = utils.augment;
Db.extend = utils.extend;

module.exports = Db;

/**
 * Configure the database instance.
 * @param  {Object} config The configuration for the database.
 * @return {Db}            The configured database object.
 */
Db.prototype.configure = function(config) {
  this.sessionId = -1;
  this.name = config.name;
  this.server = config.server;
  this.type = config.type === 'document' ? 'document' : 'graph';
  this.storage = (config.storage === 'plocal' || config.storage === 'memory') ? config.storage : 'plocal';

  this.username = config.username || 'admin';
  this.password = config.password || 'admin';
  this.dataSegments = [];
  this.transactionId = 0;

  return this;
};

/**
 * Initialize the database instance.
 */
Db.prototype.init = function() {
};

/**
 * Open the database.
 *
 * @promise {Db} The open db instance.
 */
Db.prototype.open = function() {
  if(this.sessionId !== -1) {
    return Promise.resolve(this);
  }

  this.server.logger.debug('opening database connection to ' + this.name);
  return this.server.send('db-open', {
    name: this.name,
    type: this.type,
    username: this.username,
    password: this.password
  })
    .bind(this)
    .then(function(response) {
    this.server.logger.debug('got session id ' + response.sessionId + ' for database ' + this.name);
    this.sessionId = response.sessionId;
    this.cluster.cacheData(response.clusters);
    this.serverCluster = response.serverCluster;
    this.server.once('error', function() {
      this.sessionId = null;
    }.bind(this));
    return this;
  });
};

/**
 * Send the given operation to the server, ensuring the
 * database is open first.
 *
 * @param  {Number} operation The operation to send.
 * @param  {Object} data       The data for the operation.
 * @promise {Mixed}            The result of the operation.
 */
Db.prototype.send = function(operation, data) {
  return this.open()
    .bind(this)
    .then(function() {
    this.server.logger.debug('sending operation ' + operation + ' for database ' + this.name);
    return this.server.send(operation, data);
  });
};


/**
 * Reload the configuration for the database.
 *
 * @promise {Db}  The database with reloaded configuration.
 */
Db.prototype.reload = function() {
  if(this.sessionId === -1) {
    return this.open();
  }

  this.server.logger.debug('Reloading database information');
  return this.send('db-reload').bind(this).then(function(response) {
    this.cluster.cacheData(response.clusters);
    return this;
  });
};


/**
 * Execute an SQL query against the database and retreive the raw, parsed response.
 *
 * @param   {String} query   The query or command to execute.
 * @param   {Object} options The options for the query / command.
 * @promise {Mixed}          The results of the query / command.
 */
Db.prototype.exec = function(query, options) {
  var data = {
    query: query,
    mode: 's',
    fetchPlan: '',
    limit: -1,
    class: 'com.orientechnologies.orient.core.sql.OCommandSQL'
  };
  options = options || {};

  if(options.fetchPlan && _.isString(options.fetchPlan)) {
    data.fetchPlan = options.fetchPlan;
    data.mode = 'a';
  }
  if(+options.limit === options.limit) {
    data.limit = +options.limit;
    data.mode = 'a';
  }
  if(options.mode === 'a') {
    data.mode = options.mode;
  }

  if(data.mode === 'a') {
    data.class = 'com.orientechnologies.orient.core.sql.query.OSQLAsynchQuery';
  }

  if(options.params) {
    if(_.isArray(options.params)) {
      // arrays get cast to simple objects
      data.params = {
        params: options.params.reduce(function(params, param, i) {
          params[i] = param;
          return params;
        }, {})
      };
    } else if(_.isObject(options.params)) {
      data.params = {
        params: options.params
      };
    }
  }

  this.server.logger.debug('executing query against db ' + this.name + ': ' + query);

  return this.send('command', data);
};

/**
 * Execute an SQL query against the database and retreive the results
 *
 * @param   {String} query   The query or command to execute.
 * @param   {Object} options The options for the query / command.
 * @promise {Mixed}          The results of the query / command.
 */
Db.prototype.query = function(command, options) {
  return this.exec(command, options).bind(this).then(function(response) {
    if(response.results.length === 0) {
      return [];
    }

    return response.results.map(this.normalizeResult, this).reduce(flatten, []).reduce(function(list, item) {
      if(item && item['@preloaded']) {
        delete item['@preloaded'];
        list[1].push(item);
      } else {
        list[0].push(item);
      }
      return list;
    }, [
      [],
      []
    ]);
  }).spread(function(results, preloaded) {
    if(preloaded && preloaded.length) {
      return results.map(function(result) {
        if(result && result['@rid']) {
          return this.record.resolveReferences(result, preloaded);
        } else {
          return result;
        }
      }, this);
    } else {
      return results;
    }
  });
};

/**
 * Normalize a result, where possible.
 * @param  {Object} result The result to normalize.
 * @return {Object}        The normalized result.
 */
Db.prototype.normalizeResult = function(result) {
  if(!result) {
    return result;
  }

  if(_.isArray(result)) {
    return result.map(this.normalizeResult, this);
  }

  if(result.type === 'r' || result.type === 'f') {
    return this.normalizeResultContent(result.content, this);
  }
  else if(result.type === 'p') {
    var value = this.normalizeResultContent(result.content, this);
    value['@preloaded'] = true;
    return value;
  }
  else if(result.type === 'l') {
    return result.content.map(this.normalizeResultContent, this);
  } else {
    return result;
  }
};

/**
 * Normalize the content for a result.
 * @param  {Mixed} content The content to normalize.
 * @return {Mixed}         The normalized content.
 */
Db.prototype.normalizeResultContent = function(content) {
  if(!content) {
    return null;
  }

  if(_.isArray(content)) {
    return content.map(this.normalizeResultContent, this);
  }

  if(content.type === 'd') {
    var value = content.value || {};


    value['@rid'] = new RID({
      cluster: content.cluster,
      position: content.position
    }).toString();

    return value;
  } else {
    return content;
  }
};

// # Query Builder Methods

/**
 * Create a query instance for this database.
 *
 * @return {Query} The query instance.
 */
Db.prototype.createQuery = function() {
  return new Query(this);
};

/**
 * Create a select query.
 *
 * @return {Query} The query instance.
 */
Db.prototype.select = function() {
  var query = this.createQuery();
  return query.select.apply(query, arguments);
};

/**
 * Create a traverse query.
 *
 * @return {Query} The query instance.
 */
Db.prototype.traverse = function() {
  var query = this.createQuery();
  return query.traverse.apply(query, arguments);
};


/**
 * Create an insert query.
 *
 * @return {Query} The query instance.
 */
Db.prototype.insert = function() {
  var query = this.createQuery();
  return query.insert.apply(query, arguments);
};


/**
 * Create an update query.
 *
 * @return {Query} The query instance.
 */
Db.prototype.update = function() {
  var query = this.createQuery();
  return query.update.apply(query, arguments);
};

/**
 * Create a delete query.
 *
 * @return {Query} The query instance.
 */
Db.prototype.delete = function() {
  var query = this.createQuery();
  return query.delete.apply(query, arguments);
};

/**
 * Flatten an array of arrays
 */
function flatten(list, item) {
  if(_.isArray(item)) {
    return item.reduce(flatten, list);
  } else {
    list.push(item);
  }

  return list;
}