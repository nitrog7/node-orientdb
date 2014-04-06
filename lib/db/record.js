'use strict';

var Promise = require('bluebird'),
  RID = require('../recordid'),
  errors = require('../errors'),
  _ = require('lodash');

/**
 * Insert the given record into the database.
 *
 * @param  {Object} record  The record to insert.
 * @promise {Object}        The inserted record.
 */
exports.create = function(record) {
  var className = record['@class'] || '',
    options = record['@options'] || {},
    rid, promise;

  if(record['@rid']) {
    rid = new RID(record['@rid']);
    promise = Promise.resolve(rid);
  }
  else if(className && className.defaultClusterId) {
    rid = new RID({
      cluster: className.defaultClusterId
    });
    promise = Promise.resolve(rid);
  }
  else if(className !== '') {
    promise = this.cluster.getByName(className);
  }

  return promise
    .bind(this)
    .then(function(cluster) {
      if(!cluster) {
        return Promise.reject(new errors.Operation('Cannot create record -  cluster ID and/or class is invalid.'));
      }
      else if(cluster instanceof RID) {
        rid = cluster;
      }
      else {
        rid = new RID({
          cluster: cluster.id || cluster,
          position: -1
        });
      }
      return this.send('record-create', {
        segment: options.segment !== undefined ? +options.segment : -1,
        cluster: rid.cluster,
        record: record
      });
    })
    .then(function(results) {
      rid.position = results.position;
      record['@rid'] = rid.toString();
      record['@version'] = results.version;
      return record;
    });
};

/**
 * Read the given record.
 *
 * @param  {Object} record  The record to load.
 * @param  {Object} options The query options.
 * @promise {Object}        The loaded record.
 */
exports.get = function(record, options) {
  if(_.isArray(record)) {
    return Promise.all(record.map(this.record.read, this));
  }

  var rid = RID.parse(record);

  if(!rid) {
    return Promise.reject(new errors.Operation('Cannot read - no record id specified'));
  }

  options = record['@options'] || options || {};

  return this.send('record-load', {
    cluster: rid.cluster,
    position: rid.position,
    fetchPlan: options.fetchPlan || '',
    tombstones: options.tombstones || false
  })
    .bind(this)
    .then(function(response) {
      if(response.records.length === 0) {
        return Promise.reject(new errors.Request('No such record'));
      }
      else if(response.records.length === 1) {
        return response.records[0];
      } else {
        return this.record.resolveReferences(response.records[0], response.records.slice(1));
      }
    });
};

/**
 * Resolve references to child records for the given record.
 *
 * @param  {Object}   record   The primary record.
 * @param  {Object[]} children The child records.
 * @return {Object}            The primary record with references replaced.
 */
exports.resolveReferences = function(record, children) {
  var total = children.length,
    indexed = {},
    replaceRecordIds = recordIdResolver(),
    child, i;

  for(i = 0; i<total; i++) {
    child = children[i];
    indexed[child['@rid']] = child;
  }

  for(i = 0; i<total; i++) {
    child = children[i];
    replaceRecordIds(indexed, child);
  }

  return replaceRecordIds(indexed, record);
};

function recordIdResolver() {
  var seen = {};
  return replaceRecordIds;
  /**
   * Replace references to records with their instances, where possible.
   *
   * @param  {Object} records The map of record ids to record instances.
   * @param  {Object} obj     The object to replace references within
   * @return {Object}         The object with references replaced.
   */
  function replaceRecordIds(records, obj) {
    if(_.isUndefined(obj) || !_.isObject(obj)) {
      return obj;
    }
    else if(_.isArray(obj)) {
      return obj.map(replaceRecordIds.bind(this, records));
    }
    else if(obj instanceof RID && records[obj]) {
      return records[obj];
    }

    if(obj['@rid']) {
      if(seen[obj['@rid']]) {
        return seen[obj['@rid']];
      }
      else {
        seen[obj['@rid']] = obj;
      }
    }

    var keys = Object.keys(obj),
      total = keys.length,
      i, key, value;

    for(i = 0; i<total; i++) {
      key = keys[i];
      value = obj[key];

      if(!value || !_.isObject(value) || key[0] === '@') {
        continue;
      }

      var rid = RID.parse(value);

      if(rid) {
        var item = obj[key];

        if(records[value]) {
          if(_.isArray(item)) {
            if(item.length && _.isString(item[0])) {
              obj[key] = [];
            }

            obj[key].push(records[value]);
          } else {
            obj[key] = records[value];
          }
        }
      }
      else if(_.isArray(value)) {
        obj[key] = value.map(replaceRecordIds.bind(this, records));
      } else {
        obj[key] = replaceRecordIds(records, value);
      }
    }
    return obj;
  }
}
/**
 * Read the metadata for the given record.
 *
 * @param  {Object} record The record to load.
 * @promise {Object}       The record object with loaded meta data.
 */
exports.meta = function(record) {
  if(_.isArray(record)) {
    return Promise.all(record.map(this.record.read, this));
  }

  var rid = RID.parse(record);

  if(!rid) {
    return Promise.reject(new errors.Operation('Cannot read - no record id specified'));
  }

  var options = record['@options'] || {};

  return this.send('record-metadata', {
    cluster: rid.cluster,
    position: rid.position
  })
    .bind(this)
    .then(function(response) {
      var obj = {};
      obj['@rid'] = rid.toString();
      obj['@version'] = response.version;
      return obj;
    });
};

/**
 * Update the given record.
 *
 * @param  {Object} record The record to update.
 * @promise {Object}       The updated record.
 */
exports.update = function(record) {
  var rid = RID.parse(record);

  if(!rid) {
    return Promise.reject(new errors.Operation('Cannot update record -  record ID is not specified or invalid.'));
  }

  var options = record['@options'] || {},
    promise, data;

  record['@type'] = 'd';

  data = {
    cluster: rid.cluster,
    position: rid.position,
    mode: options.mode || 0
  };

  if(options.preserve && rid) {
    promise = this.record.get(rid)
      .then(function(found) {
        var keys = Object.keys(record),
          total = keys.length,
          key, i;
        for(i = 0; i<total; i++) {
          key = keys[i];
          found[key] = record[key];
        }
        return found;
      });
  } else {
    promise = Promise.resolve(record);
  }

  return promise
    .bind(this)
    .then(function(record) {
      data.record = record;
      return this.send('record-update', data)
        .then(function(results) {
          delete record['@options'];
          record['@version'] = (results ? results.version : 0) || 0;
          return record;
        });
    });
};

/**
 * Delete the given record.
 *
 * @param   {String|RID|Object} record  The record or record id to delete.
 * @promise {Object}                    The deleted record object.
 */
exports.delete = function(record) {
  if(!record) {
    return Promise.reject(new errors.Operation('Cannot delete - no record specified'));
  }

  var rid = RID.parse(record);

  if(!rid) {
    return Promise.reject(new errors.Operation('Cannot delete - no record id specified'));
  }

  var options = record['@options'] || {};

  return this.send('record-delete', {
    cluster: rid.cluster,
    position: rid.position,
    version: record['@version'] !== undefined ? +record['@version'] : -1,
    mode: options.mode || 0
  })
    .then(function(response) {
      return record;
    });
};