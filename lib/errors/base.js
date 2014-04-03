'use strict';

var util = require('util');

/**
 * A custom error class
 */
function OrientDBError(message) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);

  this.name    = this.constructor.name;
  this.message = message;
}

util.inherits(OrientDBError, Error);

/**
 * The name of the error.
 * @type {String}
 */
OrientDBError.prototype.name = 'OrientDBError';

/**
 * Initializes the error, child classes can override this.
 * @param  {String} message the error message
 */
OrientDBError.prototype.init = function (message) {
  this.message = message;
};

/**
 * Inherit from the custom error class.
 * @param  {Function} init The init function, should have a name.
 * @return {Function}      The descendant error class.
 */
OrientDBError.inherit = function (init) {
  var parent              = this;
  var child               = function () { return parent.apply(this, arguments); };
  var Surrogate           = function () {this.constructor = child; };
  Surrogate.prototype     = parent.prototype;
  child.prototype         = new Surrogate();

  child.prototype.init    = init;
  child.prototype.name    = init.name;
  child.inherit           = parent.inherit;

  return child;
};

module.exports = OrientDBError;