/**
 * DeviceEnvReporter Plugin for denhub-device
 * This plugin works as hook of the onSendManifest event
 * https://github.com/odentools/denhub-device
 * (C) 2016 - OdenTools; Released under MIT License.
 */

'use strict';

var helper = require(__dirname + '/../../models/helper');


/**
 * Constructor
 * @param {DenHubDevice} device  Instance of DenHubDevice
 */
var DeviceEnvReporter = function (device) {

	this.device = device;

};


/**
 * Event handler which will called
 * when the device manifest is collected for sending to the server
 * @param  {Object} manifest   Current manifest data
 * @return {Object} Any additional items you desire for the manifest
 */
DeviceEnvReporter.prototype.onSendManifest = function (manifest) {

	var self = this;

	// Get the environment informations as optional data for diagnosis
	var os = require('os');
	var append_item = {
		deviceEnv: {
			arch: os.arch(),
			hostname: os.hostname(),
			platform: os.platform(),
			uptime: os.uptime(),
			ipv4: helper.getIPv4Address()
		}
	};

	// Append the informations to the manifest that will send to your server
	return append_item;

};


// ----

// Extend the object from BasePlugin
require('util').inherits(DeviceEnvReporter, require(__dirname + '/base'));

// Export the object
module.exports = DeviceEnvReporter;
