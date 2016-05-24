/**
 * TokenChanger Plugin for denhub-device
 * This plugin works as hook of the onSendManifest event
 * https://github.com/odentools/denhub-device
 * (C) 2016 - OdenTools; Released under MIT License.
 */

'use strict';

var helper = require(__dirname + '/../../models/helper');
var fs = require('fs');


/**
 * Constructor
 * @param {DenHubDevice} device  Instance of DenHubDevice
 */
var TokenChanger = function (device) {

	this.device = device;

};


/**
 * Event handler which will called when the any command has received
 * @param  {String} cmd_name     Command name
 * @param  {Object} cmd_args     Command arguments
 * @param  {Number} cmd_exec_id  Execution ID of the command
 */
TokenChanger.prototype.onCmdReceive = function (cmd_name, cmd_args, cmd_exec_id) {

	var self = this;

	if (cmd_name != '_changeToken') return;

	var new_token = cmd_args.deviceToken;
	if (new_token == null || new_token.length == 0) return;

	this.device.logInfo('TokenChanger', 'Received new token: ' + new_token);

	// Save the new token to config.json
	var config_file = require('fs').readFileSync('config.json');
	var json = JSON.parse(config_file);
	json.deviceToken = new_token;
	fs.writeFileSync('config.json', JSON.stringify(json, null, '  '));

	// Restart the daemon
	this.device.restart();

};


// ----

// Extend the object from BasePlugin
require('util').inherits(TokenChanger, require(__dirname + '/base'));

// Export the object
module.exports = TokenChanger;
