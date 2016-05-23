/**
 * HandlerCallbackRunner - A callback handler for CommandsHandler
 * https://github.com/odentools/denhub-device
 * (C) 2016 - OdenTools; Released under MIT License.
 */

'use strict';


/**
 * Constructor
 * @param {DenHubDevice} device  Instance of DenHubDevice
 * @param {String} cmd_name      Command name
 * @param {Number} cmd_exec_id   Command Execution ID
 */
var HandlerCallbackRunner = function (device, cmd_name, cmd_exec_id) {

	this.device = device;
	this.cmdName = cmd_name;
	this.cmdExecId = cmd_exec_id;

};


/**
 * Method for handle a response from the command handler method
 * @param  {Error} error     Error object
 * @param  {Object} response Response object
 */
HandlerCallbackRunner.prototype.send = function (error, response) {

	var self = this;

	if (error) {
		self.device.logWarn('HandlerCallbackRunner', 'Error occured: ' + error.toString(), true);
		self.device.getWsInstance().send(JSON.stringify({
			cmd: '_sendCmdResponse',
			args: {
				sourceCmd: self.cmdName,
				sourceCmdExecId: self.cmdExecId,
				responseSuccess: null,
				responseError: error
			},
			sentAt: new Date()
		}));
		return;
	}

	// Send a response to the server
	self.device.getWsInstance().send(JSON.stringify({
		cmd: '_sendCmdResponse',
		args: {
			sourceCmd: self.cmdName,
			sourceCmdExecId: self.cmdExecId,
			responseSuccess: response,
			responseError: null
		},
		sentAt: new Date()
	}));

};


// ----

module.exports = HandlerCallbackRunner;
