/**
 * DenHub-Device
 * https://github.com/odentools/denhub-device
 * (C) 2016 - OdenTools; Released under MIT License.
 */

'use strict';

var WebSocket = require('ws'), colors = require('colors');

var HandlerHelper = require(__dirname + '/models/handler-helper'),
	HandlerCallbackRunner = require(__dirname + '/models/handler-callback-runner'),
	HandlerLogger = require(__dirname + '/models/handler-logger'),
	helper = require(__dirname + '/models/helper');


/**
 * Constructor
 * @param {Object} CommandsHandlerModel  Class of CommandsHandler
 * @param {Object} opt_config            Configuration data
 */
var DenHubDevice = function (CommandsHandlerModel, opt_config) {

	this.config = opt_config || helper.getConfig(false);
	this.webSocket = null;

	// Instances of the plugins
	this.pluginInstances = {};
	this._initPlugins();

	// Make an instance of the CommandsHandler
	var ch_logger = new HandlerLogger(this);
	var handler_helper = new HandlerHelper(this);
	this.commandsHandler = new CommandsHandlerModel(this.config, ch_logger, handler_helper);

	// Check the command arguments
	if (process.argv.indexOf('--development') != -1) {
		this.config.isDebugMode = true;
	}

	// Check the options
	this.isDebugMode = this.config.isDebugMode || false;
	this.isSuppressLog = this.config.isSuppressLog || false;

	// Check the configuration
	if (this.config.denhubServerHost == null){
		throw new Error('A required configuration undefined: denhubServerHost');
	} else if (this.config.deviceName == null) {
		throw new Error('A required configuration undefined: deviceName');
	} else if (this.config.deviceType == null) {
		throw new Error('A required configuration undefined: deviceType');
	}

	// Interval time (millisec) for reconnecting to server
	this.config.reconnectDelayTimeMsec = this.config.reconnectDelayTimeMsec || 5000;

	// Interval time (millisec) for restarting when the fatal error occurred
	this.config.restartDelayTime = this.config.restartDelayTime || 6000;

};


/**
 * Start the daemon
 * @param  {Function} opt_callback Callback - function (error, websocket_connection)
 */
DenHubDevice.prototype.start = function (opt_callback) {

	var self = this;

	// Set the fatal exception handler
	if (!self.isDebugMode) {
		process.on('uncaughtException', function (err) {
			self.logError('uncaughtException', err.stack.toString(), true);
			self.restart();
		});
	}

	// Connect to the WebSocket Server
	var url = self.config.denhubServerHost + '?deviceName=' + self.config.deviceName  + '&deviceType=' + self.config.deviceType
		+ '&deviceToken=' + self.config.deviceToken;
	if (url.match(/ws:/)) {
		self.logWarn('start', 'ws:// schema is not secure. We recommended to use the secure connection.');
	}
	try {
		self.webSocket = new WebSocket(url);
	} catch (e) {
		if (opt_callback) opt_callback(e, null);
		if (self.isDebugMode) throw e;
		self.logWarn('ws', 'Could not connect to server; Reconnecting...');
		setTimeout(self.start, self.config.reconnectDelayTimeMsec);
	}

	// Set the event listener - Connection Opened
	self.webSocket.on('open', function () {

		self.logDebug('ws', 'Connected to ' + self.config.denhubServerHost + ' :)');

		if (opt_callback) opt_callback(null, self.webSocket);

		// Send the manifest
		self._sendManifest();

	});

	// Set the event listener - Connection Closed
	self.webSocket.on('close', function() {

		if (opt_callback) opt_callback(new Error('Connection closed'), null);
		if (self.isDebugMode) throw new Error('Connection closed');

		// Re-connect
		self.logWarn('ws', 'Disconnected from server; Reconnecting...');
		setTimeout(self.start, self.config.reconnectDelayTimeMsec);

	});

	// Set the event listener - Message Received
	self.webSocket.on('message', function (message, flags) {

		var data = {};
		try {
			data = JSON.parse(message);
		} catch (e) {
			return;
		}

		if (!data.cmd) return;

		self._onCmdMessage(data);

	});

};


/**
 * Exit the daemon
 */
DenHubDevice.prototype.exit = function () {

	var self = this;

	process.exit(0);

};


/**
 * Restart the daemon
 */
DenHubDevice.prototype.restart = function () {

	var self = this;

	self.logInfo('restart', 'The daemon will be restart soon...\n\
If you need cancel the restarting, try the command: $ kill -9 ' + process.pid, true);

	var timer = setTimeout(function () {

		// Get the command and parameters of myself
		var argv = process.argv.concat(); // Copy the arguments array
		var cmd = argv.shift();

		// Start the new app
		console.log('Restarting...');
		var child = null;
		try {
			child = require('child_process').spawn(cmd, argv, {
				cwd: process.cwd,
				detached: true,
				env: process.env,
				stdio: [process.stdin, process.stdout, process.stderr]
			});
			child.unref();
		} catch (e) {
			console.log('Could not restart myself - ' + e.toString());
			return;
		}

		// Exit myself
		var timer_ = setTimeout(function() {
			process.exit(0);
		}, 500);

	}, self.config.restartDelayTime);

};


/**
 * Get an instance of the denhub device plugin
 * @param  {String} plugin_name  Name of the plugin
 * @return  {Object} Initialized instance of the plugin
 */
DenHubDevice.prototype.getPlugin = function (plugin_name) {

	var self = this;

	var plugin_type = 'local'; // 'core' or 'local'
	if (plugin_name.match(/^\_(.+)$/)) {
		plugin_name = RegExp.$1;
		plugin_type = 'core';
	}

	// Return an instance from the plugins array
	var instance = self.pluginInstances[plugin_type + ':' + plugin_name] || null;
	return instance;

};



/**
 * Get the websocket instance
 * @return {WebSocket} WebSocket instance
 */
DenHubDevice.prototype.getWsInstance = function () {

	var self = this;

	return self.webSocket;

};


/**
 * Print the message to the debug log
 * @param  {String} tag_text     Tag string of the item
 * @param  {Object} log_obj      Log object of the item
 * @param  {Boolean} is_dont_send Whether the log to send to server
 */
DenHubDevice.prototype.logDebug = function (tag_text, log_obj, is_dont_send) {

	this._log('debug', tag_text, log_obj, is_dont_send);

};


/**
 * Print the message to the information log
 * @param  {String} tag_text     Tag string of the item
 * @param  {Object} log_obj      Log object of the item
 * @param  {Boolean} is_dont_send Whether the log to send to server
 */
DenHubDevice.prototype.logInfo = function (tag_text, log_obj, is_dont_send) {

	this._log('info', tag_text, log_obj, is_dont_send);

};


/**
 * Print the message to the warning log
 * @param  {String} tag_text     Tag string of the item
 * @param  {Object} log_obj      Log object of the item
 * @param  {Boolean} is_dont_send Whether the log to send to server
 */
DenHubDevice.prototype.logWarn = function (tag_text, log_obj, is_dont_send) {

	this._log('warn', tag_text, log_obj, is_dont_send);

};


/**
 * Print the message to the error log
 * @param  {String} tag_text     Tag string of the item
 * @param  {Object} log_obj      Log object of the item
 * @param  {Boolean} is_dont_send Whether the log to send to server
 */
DenHubDevice.prototype.logError = function (tag_text, log_obj, is_dont_send) {

	this._log('error', tag_text, log_obj, is_dont_send);

};


/**
 * Method for handle the command message
 * @param  {Object} data Received command message
 */
DenHubDevice.prototype._onCmdMessage = function (data) {

	var self = this;

	// Get the command parameters
	var cmd_name = data.cmd;
	if (cmd_name.match(/^\_/)) return;

	var cmd_exec_id = data.cmdExecId || -1;

	var cmd_args = data.args || {};

	// Call a hook of the plugins
	for (var plugin_name in self.pluginInstances) {
		try {
			self.pluginInstances[plugin_name].onCmdReceive(cmd_name, cmd_args, cmd_exec_id);
		} catch (e) {
			self.logDebug('_onCmdMessage', 'Could not call onCmdReceive hook of the plugin: ' + plugin_name);
		}
	}

	// Make a callback runner
	var callback_runner = new HandlerCallbackRunner(self, cmd_name, cmd_exec_id);

	// Find the handler method from an instance of CommandsHandler
	var commands_list = self.config.commands || self.config.cmds;
	var is_executed_handler = false, is_wont_response = false;
	for (var key in commands_list) {

		if (key == cmd_name) {

			try {
				// Execute the handler method
				is_wont_response = self.commandsHandler[key](cmd_args, callback_runner);
				is_executed_handler = true;
			} catch (e) {
				self.logWarn('_onCmdMessage', 'Error occurred in the command handler: ' + cmd_name + '\n' + e.stack.toString());
			}

			break;
		}

	}

	if (!is_executed_handler) {
		self.logDebug('_onCmdMessage', 'Not found the matched command handler to ' + cmd_name);
	} else if (is_wont_response) {
		callback_runner.send(null, 'Command executed');
	}

};


/**
 * Initialize an instance of the each plugins
 */
DenHubDevice.prototype._initPlugins = function (plugin_name, callback) {

	var self = this;

	var fs = require('fs');
	var plugin_dir_base_path = __dirname + '/plugins';

	self.pluginInstances = {};

	var PLUGIN_TYPES = ['core', 'local'];

	// Initialize the plugins
	PLUGIN_TYPES.forEach(function (plugin_type, i) {

		var file_list = [];
		try {
			file_list = fs.readdirSync(plugin_dir_base_path + '/' + plugin_type);
		} catch (e) {
			return;
		}

		file_list.forEach(function (plugin_filename, i) {
			if (plugin_filename.match(/^([a-zA-Z0-9_\-]+)\.js$/)) {

				var plugin_name = RegExp.$1;
				if (plugin_type == 'core' && plugin_name == 'base') return; // /plugins/core/base.js should be ignored

				// Initialize an instance of the plugin
				var instance = null;
				self.logDebug('_initPlugins', 'Initialize the plugin: ' + plugin_dir_base_path + '/' + plugin_type + '/' + plugin_name);
				try {
					var PluginClass = require(plugin_dir_base_path + '/' + plugin_type + '/' + plugin_name);
					instance = new PluginClass(self);
				} catch (e) {
					self.logWarn('_initPlugins', e.stack.toString());
				}

				// Save the instance to plugins array
				self.pluginInstances[plugin_type + ':' + plugin_name] = instance || null;

			}
		});

	});

};


/**
 * Send a device manifest to the server
 */
DenHubDevice.prototype._sendManifest = function () {

	var self = this;

	var manifest = self.config;

	// Call a hook of the plugins
	for (var plugin_name in self.pluginInstances) {
		try {
			var append_items = self.pluginInstances[plugin_name].onSendManifest(manifest);
			for (var key in append_items) {
				manifest[key] = append_items[key];
			}
		} catch (e) {
			self.logDebug('_sendManifest', 'Could not call onSendManifest hook of the plugin: ' + plugin_name);
		}
	}

	// Add a package name and version from the package.json
	manifest.deviceDaemon = helper.getPackageInfo().name + '/' + helper.getPackageInfo().version;

	// Send to server
	self.webSocket.send(JSON.stringify(manifest));

};


/**
 * Print the message to the log
 * @param  {String} type_str    Type string of the item - 'debug', 'info', 'warn', 'error'
 * @param  {String} tag_str     Tag string of the item
 * @param  {Object} log_obj     Log object of the item
 * @param  {Boolean} is_dont_send Whether the log to send to server
 */
DenHubDevice.prototype._log = function (type_str, tag_str, log_obj, is_dont_send) {

	var self = this;

	var log_text = new String();
	if (log_obj != null) {
		var text_class = Object.prototype.toString.call(log_obj).slice(8, -1);
		if (text_class == 'Object' || text_class == 'Array') { // Map or Array
			log_text = JSON.stringify(log_obj, null, '\t');
		} else if (text_class == 'Error' && log_obj.stack != null) {
			log_text = log_obj.stack.toString();
		} else {
			log_text = log_obj;
		}
	}

	if (type_str == 'info') {
		console.log(colors.blue('[' + helper.toUpperCase(type_str) + '] ') + tag_str + ' / ' + log_text);
	} else if (type_str == 'warn') {
		console.log(colors.yellow('[' + helper.toUpperCase(type_str) + '] ') + tag_str + ' / ' + log_text);
	} else if (type_str == 'error') {
		console.log(colors.red('[' + helper.toUpperCase(type_str) + '] ') + tag_str + ' / ' + log_text);
	} else {
		console.log(colors.gray('[' + helper.toUpperCase(type_str) + '] ' + tag_str + ' / ' + log_text));
	}

	if (is_dont_send) return;

	try {
		self.webSocket.send(JSON.stringify({
			cmd: '_sendLog',
			args: {
				type: type_str,
				text: log_text,
				tag: tag_str
			},
			sentAt: new Date().getTime()
		}));
	} catch (e) {
		return;
	}

};


// ----

module.exports = DenHubDevice;
