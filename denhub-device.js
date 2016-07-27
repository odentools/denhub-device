/**
 * denhub-device
 * https://github.com/odentools/denhub-device
 * (C) 2016 - OdenTools; Released under MIT License.
 */

'use strict';

var WebSocket = require('ws'), colors = require('colors'),
	url = require('url'), util = require('util');

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

	// Configuration
	this.config = opt_config || helper.getConfig(false);

	// WebSocket Connection
	this.webSocket = null;
	this.heartbeatTimer = null;

	// Instances of the plugins
	this.pluginInstances = {};
	this._initPlugins();

	// Instances of the command modules
	this.commandModules = {};
	this._initCommandModules();

	// Make an instance of the CommandsHandler
	var ch_logger = new HandlerLogger(this);
	var handler_helper = new HandlerHelper(this);
	this.commandsHandler = new CommandsHandlerModel(this.config, ch_logger, handler_helper);

	// Check the command arguments
	if (process.argv.indexOf('--dev') != -1 || process.argv.indexOf('--development') != -1) {
		this.config.isDebugMode = true;
	}

	// Check the options
	this.isDebugMode = this.config.isDebugMode || false;

	// Check the configuration
	if (this.config.denhubServerHost == null){
		throw new Error('A required configuration undefined: denhubServerHost');
	} else if (this.config.deviceName == null) {
		throw new Error('A required configuration undefined: deviceName');
	} else if (this.config.deviceType == null) {
		throw new Error('A required configuration undefined: deviceType');
	}

	// Interval time (millisec) for reconnecting to server
	this.config.reconnectDelayTime = this.config.reconnectDelayTime || 5000;

	// Interval time (millisec) for restarting when the fatal error occurred
	this.config.restartDelayTime = this.config.restartDelayTime || 6000;

	// Interval time (millisec) for heartbeat sending
	this.config.heartbeatIntervalTime = this.config.heartbeatIntervalTime || 10000;

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
			try {
				self.logError('uncaughtException', err, true);
				self.restart();
			} catch (e) {
				console.log('Automatic restart is unavailable.', self, e.toString());
			}
		});
	}

	// Make a websocket url
	if (self.config.denhubServerHost.match(/ws:\/\/[a-zA-Z0-9_\-]+\.herokuapp\.com/)) {
		self.config.denhubServerHost = self.config.denhubServerHost.replace(/^ws:\/\//, 'wss://');
		self.logWarn('start', 'Your denhubServerHost was automatically upgraded to \'wss:\' schema for security reason: '
			+ self.config.denhubServerHost);
	}
	var ws_url = url.format({
		query: {
			deviceName: self.config.deviceName,
			deviceType: self.config.deviceType,
			deviceToken: self.config.deviceToken
		}
	});
	ws_url = self.config.denhubServerHost + ws_url;

	// Reset the heartbeat timer
	if (self.heartbeatTimer != null) {
		clearInterval(self.heartbeatTimer);
	}

	// Connect to the WebSocket Server
	if (self.config.isDebugMode) {
		self.logInfo('start', 'Connecting to server... ' + ws_url);
	} else {
		self.logInfo('start', 'Connecting to server...');
	}
	if (!ws_url.match(/(localhost|172\.0\.0\.1)/) && ws_url.match(/ws:/)) {
		self.logWarn('start', '\'ws:\' schema is NOT SECURE! We recommended to use the secure connection.');
	}
	try {
		self.webSocket = new WebSocket(ws_url);
	} catch (e) {
		if (opt_callback) opt_callback(e, null);
		if (self.isDebugMode) throw e;
		self.logWarn('ws', 'Could not connect to server; Reconnecting...');
		setTimeout(function () {
			self.start();
		}, self.config.reconnectDelayTime);
	}

	// Set the event listener - Connection Opened
	self.webSocket.on('open', function () {

		self.logDebug('ws', 'Connected to ' + self.config.denhubServerHost + ' :)');

		// Send the manifest
		setTimeout(function () {
			self._sendManifest();
		}, 100);

		// Start the heartbeat sending
		if (self.heartbeatTimer != null) {
			clearInterval(self.heartbeatTimer);
		}
		self.heartbeatTimer = setInterval(function() {

			try {

				// Send a heartbeat
				self.webSocket.send(JSON.stringify({
					cmd: '_sendHeartbeat',
					args: {},
					sentAt: new Date().getTime()
				}));

			} catch (e) {

				clearInterval(self.heartbeatTimer);
				self.logError('ws', 'Could not sent a heartbeat - ' + e.stack);

				// Re-connect
				self.logWarn('ws', ' Reconnecting...');
				setTimeout(function () {
					self.start();
				}, self.config.reconnectDelayTime);

			}
		}, self.config.heartbeatIntervalTime);

		// Call the callback
		if (opt_callback) opt_callback(null, self.webSocket);

	});

	// Set the event listener - Connection Closed
	self.webSocket.on('close', function() {

		clearInterval(self.heartbeatTimer);

		if (opt_callback) opt_callback(new Error('Connection closed'), null);
		if (self.isDebugMode) throw new Error('Connection closed');

		// Re-connect
		self.logWarn('ws', 'Disconnected from server; Reconnecting...');
		setTimeout(function () {
			self.start();
		}, self.config.reconnectDelayTime);

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

	if (self.isRestarting) return;
	self.isRestarting = true;

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
	var cmd_exec_id = data.cmdExecId || -1;
	var cmd_args = data.args || {};

	self.logInfo('_onCmdMessage', 'Received command: ' + cmd_name);

	// Call a hook of the plugins
	for (var plugin_name in self.pluginInstances) {
		try {
			self.pluginInstances[plugin_name].onCmdReceive(cmd_name, cmd_args, cmd_exec_id);
		} catch (e) {
			self.logWarn('_onCmdMessage', 'Could not call onCmdReceive hook of the plugin: ' + plugin_name);
		}
	}

	if (cmd_name.match(/^\_/)) return;

	// Make a callback runner
	var callback_runner = new HandlerCallbackRunner(self, cmd_name, cmd_exec_id);

	// Find the handler method from an instance of the the user's commands handler
	var is_executed_handler = false, is_wont_response = false, executed_module_name = 'LOCAL';
	var exec_result = self._execCmdOnCommandHandler(cmd_name, cmd_args, callback_runner, self.commandsHandler, self.config.commands);
	if (exec_result.isWontResponse) is_wont_response = true;
	if (exec_result.isExecuted) is_executed_handler = true;

	// Find the handler method from an instance of the each Command Modules
	if (!is_executed_handler && cmd_name.match(/:([a-zA-Z0-9_]+)$/)) {

		var cmd_name_ = RegExp.$1, commands_list = {};
		exec_result = {};

		for (var module_name in self.commandModules) {

			var command_handler = self.commandModules[module_name].instance || null;
			commands_list = self.commandModules[module_name].commands || null;
			if (!command_handler || !commands_list) continue;

			exec_result = self._execCmdOnCommandHandler(cmd_name_, cmd_args, callback_runner, command_handler, commands_list);

			if (exec_result.isWontResponse) is_wont_response = true;
			if (exec_result.isExecuted) {
				executed_module_name = module_name;
				is_executed_handler = true;
				break;
			}
		}
	}

	// Done
	if (is_executed_handler) {
		if (self.isDebugMode) self.logDebug('_onCmdMessage', 'Command executed: ' + cmd_name + ' on ' + executed_module_name);
		if (is_wont_response) callback_runner.send(null, 'Command executed');
	} else {
		self.logDebug('_onCmdMessage', 'Not found the matched command handler to ' + cmd_name);
	}

};


/**
 * Execute the command on the CommandHandler
 * @param  {String} cmd_name             Name of the receivec command
 * @param  {Object} cmd_args             Arguments of the received command
 * @param  {CallbackRunner} cb_runner    Callback runner for response
 * @param  {CommandHandler} cmd_handler  Instance of the commands handler
 * @param  {Object} cmds_list            Map of the commands of this commands handler
 * @return {Object}
 */
DenHubDevice.prototype._execCmdOnCommandHandler = function (cmd_name, cmd_args, cb_runner, cmd_handler, cmds_list) {

	var self = this;

	var is_wont_response = false;
	var is_executed_handler = false;

	// Find the handler method from an instance of CommandsHandler
	for (var key in cmds_list) {

		if (key == cmd_name) {

			try {
				// Execute the handler method
				is_wont_response = cmd_handler[key](cmd_args, cb_runner);
				is_executed_handler = true;
			} catch (e) {
				self.logWarn('_onCmdMessage', 'Error occurred in the command handler: ' + cmd_name + '\n' + e.stack.toString());
			}

			break;
		}

	}

	return {
		isWontResponse: is_wont_response,
		isExecuted: is_executed_handler
	};

};


/**
 * Load the instances of the each plugins
 */
DenHubDevice.prototype._initPlugins = function (callback) {

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
 * Load the instances of the each command modules
 */
DenHubDevice.prototype._initCommandModules = function () {

	var self = this;

	self.commandModules = {};

	var fs = require('fs');

	// Find a commands handler module from the module directory
	var shared_commands_search_path = process.cwd() + '/node_modules';
	var dir_list = [];
	try {
		dir_list = fs.readdirSync(shared_commands_search_path + '/');
	} catch (e) {
		return;
	}

	dir_list.forEach(function (node_module_name) {
		if (node_module_name.match(/^denhub-device-(.+)$/)) {

			var module_name = RegExp.$1;

			// Initialize the item of this module on commandModules
			self.commandModules[module_name] = {
				commands: {},
				instance: null
			};

		}
	});

	// Initialize the logger and helper for the modules
	var ch_logger = new HandlerLogger(this);
	var handler_helper = new HandlerHelper(this);

	// Initialize the commands modules
	for (var module_name in self.commandModules) {

		var dir_path = shared_commands_search_path + '/denhub-device-' + module_name;
		self.logDebug('_initCommandModules', 'Initialize a commands handler of the module: ' + dir_path);

		// Make an configuration for this module
		var ch_config = util._extend({}, self.config);
		ch_config.denhubServerHost = null; // for security reason
		ch_config.serverToken = null; // for security reason

		// Read the commands definition of this module
		try {
			ch_config.commands = helper.getCommandsByCommandModulePath(dir_path);
		} catch (e) {
			self.logWarn('_initCommandModules', e.stack.toString());
		}

		self.commandModules[module_name].commands = ch_config.commands;

		// Initialize an instance of the CommandsHandler of this module
		var instance = null;
		try {
			var CommandsHandlerClass = require(dir_path);
			instance = new CommandsHandlerClass(ch_config, ch_logger, handler_helper);
		} catch (e) {
			self.logWarn('_initCommandModules', e.stack.toString());
		}

		self.commandModules[module_name].instance = instance;

	}

};


/**
 * Send a device manifest to the server
 */
DenHubDevice.prototype._sendManifest = function () {

	var self = this;

	// Clone the configuration object
	var manifest = JSON.parse(JSON.stringify(self.config));

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

	// Add the information of the each command modules
	manifest.commandModuleNames = [];
	for (var module_name in self.commandModules) {

		// Add the name of this module
		manifest.commandModuleNames.push(module_name);

		// Add the commands of this module
		var module_commands = self.commandModules[module_name].commands;
		for (var command_name in module_commands) {
			manifest.commands[module_name + ':' + command_name] = module_commands[command_name];
		}

	}

	// Send to server
	var manifest_json = JSON.stringify({
		cmd: '_sendManifest',
		args: manifest
	});
	self.webSocket.send(manifest_json);

	if (self.isDebugMode) {
		self.logDebug('ws', 'Send a manifest to the server:\n' + JSON.stringify({
			cmd: '_sendManifest',
			args: manifest
		}, null, '  '));
	} else {
		self.logDebug('ws', 'Send a manifest to the server');
	}

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
