/**
 * KVS Plugin for denhub-device
 * https://github.com/odentools/denhub-device
 * (C) 2016 - OdenTools; Released under MIT License.
 */

'use strict';

var helper = require(__dirname + '/../../models/helper');


/**
 * Constructor
 * @param {DenHubDevice} device  Instance of DenHubDevice
 */
var DenHubKvs = function (device) {

	this.device = device;

};


/**
 * Get an item from the KVS
 * @param  {String} key         Key of the item
 * @param  {Function} callback  Callback function - function (error, data)
 */
DenHubKvs.prototype.get = function (key, callback) {

	var self = this;

	// Send a request to the server
	self.device.getWsInstance().send(JSON.stringify({
		cmd: '_getKvs',
		args: {
			key: key
		}
	}));

};


/**
 * Set the item to the KVS
 * @param  {String} key             Key of the item
 * @param  {Object} data            Data of the item
 * @param  {Number} opt_lifetime    Lifetime seconds of the item (optional)
 * @param  {Function} callback      Callback function - function (error)
 */
DenHubKvs.prototype.set = function (key, data, opt_lifetime, callback) {

	var self = this;

	if (callback == null && opt_lifetime != null && helper.isType(callback, 'Function')) {
		callback = opt_lifetime;
		opt_lifetime = null;
	}

	if (opt_lifetime != null && helper.isType(opt_lifetime, 'Number')) {
		var now = new Date().getTime() + opt_lifetime;
	}

	if (data != null && (helper.isType(data, 'Array') || helper.isType(data, 'Object'))) {
		data = JSON.stringify(data);
	}

	// Send a request to the server
	self.device.getWsInstance().send(JSON.stringify({
		cmd: '_setKvs',
		args: {
			key: key,
			value: data,
			lifetime: opt_lifetime || null
		}
	}));

};


// ----

// Extend the object from BasePlugin
require('util').inherits(DenHubKvs, require(__dirname + '/base'));

// Export the object
module.exports = DenHubKvs;
