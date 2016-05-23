/**
 * Base Plugin for denhub-device
 * https://github.com/odentools/denhub-device
 * (C) 2016 - OdenTools; Released under MIT License.
 */

'use strict';


/**
 * Constructor
 * @param {DenHubDevice} device  Instance of DenHubDevice
 */
var BasePlugin = function (device) {

	this.device = device;

};


/**
 * Event handler which will called
 * when the device manifest is collected for sending to the server
 * @param  {Object} manifest   Current manifest data
 * @return {Object} Any additional items you desire for the manifest
 */
BasePlugin.prototype.onSendManifest = function (manifest) {

	var self = this;
	return {};

};


/**
 * Event handler which will called when the any command has received
 * @param  {String} cmd_name     Command name
 * @param  {Object} cmd_args     Command arguments
 * @param  {Number} cmd_exec_id  Execution ID of the command
 */
BasePlugin.prototype.onCmdReceive = function (cmd_name, cmd_args, cmd_exec_id) {

	var self = this;

};


// ----

module.exports = BasePlugin;
