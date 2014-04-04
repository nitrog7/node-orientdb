'use strict';

var RecordID = require('../recordid'),
  _ = require('lodash');

/**
 * Serialize a record and return it as a buffer.
 *
 * @param  {Object} content The record to serialize.
 * @return {Buffer}         The buffer containing the content.
 */
var encodeRecordData = function(content) {
  return new Buffer(serializeDocument(content), 'utf8');
};

/**
 * Serialize a document.
 *
 * @param  {Object}  document The document to serialize.
 * @param  {Boolean} isMap    Whether to serialize the document as a map.
 * @return {String}           The serialized document.
 */
var serializeDocument = function(document, isMap) {
  var result = '',
    className = '',
    fieldNames = Object.keys(document);

  for(var g = 0; g<fieldNames.length; g++) {
    var field = fieldNames[g],
      value = document[field];

    if(field === '@version' || field === '@rid' || field === '@type' || field === '@options') {
      continue;
    }
    else if(field === '@class') {
      className = value;
    } else {
      var fieldWrap;

      if(isMap) {
        fieldWrap = '"';
      } else {
        fieldWrap = '';
      }

      result += fieldWrap + field + fieldWrap + ':' + serializeValue(value) + ',';
    }
  }

  if(className !== '') {
    result = className + '@' + result;
  }

  if(result[result.length - 1] === ',') {
    result = result.slice(0, -1);
  }

  return result;
};

/**
 * Serialize a given value according to its type.
 * @param  {Object} value The value to serialize.
 * @return {String}       The serialized value.
 */
var serializeValue = function(value) {
  if(isMD5(value)) {
    return '""' + value.replace(/\\/, '\\\\').replace(/"/g, '\\"') + '""';
  }
  else if('' + value === value) {
    return '"' + value.replace(/\\/, '\\\\').replace(/"/g, '\\"') + '"';
  }
  else if(+value === value) {
    return ~('' + value).indexOf('.') ? value + 'f' : value;
  }
  else if(value === true || value === false) {
    return value ? true : false;
  }
  else if(Object.prototype.toString.call(value) === '[object Date]') {
    return value.getTime() + 't';
  }
  else if(_.isArray(value)) {
    return serializeArray(value);
  }
  else if(value === Object(value)) {
    return serializeObject(value);
  } else {
    return '';
  }
};


/**
 * Serialize an array of values.
 * @param  {Array} value The value to serialize.
 * @return {String}      The serialized value.
 */
var serializeArray = function(value) {
  var result = '[', i, limit;

  for(i = 0, limit = value.length; i<limit; i++) {
    if(value[i] === Object(value[i])) {
      result += serializeObject(value[i]);
    } else {
      result += serializeValue(value[i]);
    }

    if(i<limit - 1) {
      result += ',';
    }
  }

  result += ']';
  return result;
};

/**
 * Serialize an object.
 * @param  {Object} value The value to serialize.
 * @return {String}       The serialized value.
 */
var serializeObject = function(value) {
  if(value instanceof RecordID) {
    return '' + value;
  }
  else if(value['@type'] === 'd') {
    return '(' + serializeDocument(value, false) + ')';
  } else {
    return '{' + serializeDocument(value, true) + '}';
  }
};


/**
 * Determine whether the given value is a valid MD5 hash.
 * @param  {String}  value The value to check
 * @return {Boolean}       true if the value is a valid md5, otherwise false.
 */
var isMD5 = function(value) {
  return /^[0-9a-f]{32}$/i.test(value);
};


// Export the public methods
exports.serializeDocument = serializeDocument;
exports.serializeValue = serializeValue;
exports.encodeRecordData = encodeRecordData;