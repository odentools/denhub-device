#!/usr/bin/env node
/**
 * Generator for DenHub-Device
 * https://github.com/odentools/denhub-device
 * (C) 2016 - OdenTools; Released under MIT License.
 */

'use strict';

var minimist = require('minimist'), inquirer = require('inquirer'),
	fs = require('fs'), colors = require('colors');
var helper = require(__dirname + '/../models/helper');

var CONFIG_FILENAME = 'config.json', COMMANDS_FILENAME = 'commands.json',
	ENTRY_POINT_FILENAME = 'index.js', HANDLER_FILENAME = 'handler.js';

console.log('>> DenHub-Device Generator <<\n\
(C) 2016 - DenHub IoT Project & OdenTools\n\
--------------------------------------------------\n');

// Parse the arguments
var argv = minimist(process.argv.slice(2));
var config = {};
if (argv.init | argv.i) { // Manifest Generator Mode

	// Read the configuration file
	config = helper.getConfig(true); // Allow the incomplete configuration file

	// Run the configuration generator
	generateConfig(config);

} else if (argv.help | argv.h) { // Help mode

	var help = 'denhub-device-generator [--init|-i] [--help|-h]\n\n\
\
--init\n\
	Run the Configuration Generator and the Code Generator\n\
\n\
--help\n\
	Print this help message\n\
\n\
\n\
NOTE: If you not specified any options,\n\
	this command runs only the Code Generator.\n';

	console.log(help);

} else {

	// Read the configuration file
	config = helper.getConfig(false);

	// Generate the source code of the device
	generateCode(config);

}

// ----


/**
 * Generate the configuration file
 * @param  {Object} old_config Current configuration
 */
function generateConfig (old_config) {

	var self = this;

	console.log(colors.bold('--------------- Configuration Generator ---------------\n'));

	var questions = [
		{
			type: 'input',
			name: 'deviceName',
			message: (old_config.deviceName) ? 'deviceName ?' : 'deviceName ? (e.g. rccar-0)',
			default: old_config.deviceName,
			validate: function (value) {
				if (value.match(/^[A-Za-z0-9_\-]+$/)) return true;
				return 'Available characters for deviceName: A-Z, a-z, 0-9, underscore, hyphen';
			}
		},
		{
			type: 'input',
			name: 'deviceType',
			message: (old_config.deviceType) ? 'deviceType ?' : 'deviceType (e.g. rccar) ?',
			default: old_config.deviceType,
			validate: function (value) {
				if (value.match(/^[A-Za-z0-9_\-]+$/)) return true;
				return 'Available characters for deviceType: A-Z, a-z, 0-9, underscore, hyphen';
			}
		},
		{
			type: 'input',
			name: 'deviceToken',
			message: (old_config.deviceToken) ? 'deviceToken ?' : 'deviceToken ? (If already generated on server)',
			default: old_config.deviceToken,
			validate: function (value) {
				if (value.length == 0 || value.match(/^[a-zA-Z0-9]+$/)) return true;
				return 'Your input seems invalid format';
			}
		},
		{
			type: 'input',
			name: 'denhubServerHost',
			message: (old_config.denhubServerHost) ? 'denhubServerHost ?' : 'denhubServerHost ? (e.g. wss://example.com/)',
			default: old_config.denhubServerHost,
			validate: function (value) {
				if (value.match(/^(ws|wss):\/\/[a-zA-Z0-9_\-\.\:]+\/*$/)) return true;
				return 'Your input seems invalid format';
			}
		}

	];

	// Read the template of commands definition
	var commands_tmpl = fs.readFileSync(__dirname + '/../templates/' + COMMANDS_FILENAME + '.tmpl').toString();

	// Start the question
	inquirer.prompt(questions).then(function (answer) {

		// Generate the configuration values
		if (answer.deviceToken.match(/^\s*$/)) {
			answer.deviceToken = null;
		}

		var config = answer;
		config.commands = old_config.commands || {};

		// Preview of the configuration file
		var formatted_json = JSON.stringify(config,  null, '    ');
		console.log('\n\n' + formatted_json + '\n');

		// Confirmation for save the configuration file
		inquirer.prompt([{
			type: 'confirm',
			name: 'confirmSaveConfig',
			message: 'The configuration file was generated. Would you write it to ' + CONFIG_FILENAME + ' ?'

		}]).then(function (answer) {

			if (!answer.confirmSaveConfig) return false;

			// Save the configuration file
			console.log('\nWriting to ' + process.cwd() + '/' + CONFIG_FILENAME);
			fs.writeFileSync(CONFIG_FILENAME, formatted_json);
			console.log('Writing has been completed.\n\n');

			return true;

		}).then(function (is_wrote) {

			// Check the commands file
			var commands_file = null;
			try {
				commands_file = JSON.parse(fs.readFileSync(COMMANDS_FILENAME));
			} catch (e) {
				commands_file = null;
			}

			if (commands_file != null) {
				// Skip
				return {
					confirmSaveCommands: false
				};
			}

			console.log(commands_tmpl);

			return inquirer.prompt([{
				type: 'confirm',
				name: 'confirmSaveCommands',
				message: 'The commands file was not found. Would you write the example to ' + COMMANDS_FILENAME + ' ?'
			}]);

		}).then(function (answer) {

			if (!answer.confirmSaveCommands) return false;

			// Save the commands file
			console.log('\nWriting to ' + process.cwd() + '/' + COMMANDS_FILENAME);
			fs.writeFileSync(COMMANDS_FILENAME, commands_tmpl);
			console.log('Writing has been completed.\n\n');

			return true;

		}).then(function (is_wrote) {

			// Confirmation for continue
			return inquirer.prompt([{
				type: 'confirm',
				name: 'continueConfirm',
				message: 'Would you generate the source code now ?'
			}]);

		}).then(function (answer) {

			if (!answer.continueConfirm) {
				console.log(colors.bold.green('\nAll was completed :)'));
				return;
			}

			// Generate the source code of the device
			generateCode(config);

		});

	});

}


/**
 * Generate the source code for device daemon
 * @param  {Object} config Device configuration
 */
function generateCode (config) {

	console.log(colors.bold('--------------- Code Generator ---------------\n'));

	// Check the configuration
	if (!config.commands) {
		throw new Error('commands undefined in your config.js');
	}

	// Start the processes
	var entry_js = null, handler_js = null, package_json = null;
	Promise.resolve()
	.then(function () {

		// Generate the entry point script
		entry_js = generateCodeEntryJs(config);

		// Preview of the entry point script
		console.log(entry_js);

		// Confirm to user
		return inquirer.prompt([{
			type: 'confirm',
			name: 'confirmSaveEntryJs',
			message: 'The entry point was generated. Would you write it to ' + ENTRY_POINT_FILENAME + ' ?'
		}]);

	}).then(function (answer) {

		if (!answer.confirmSaveEntryJs) {
			entry_js = null;
			return false;
		}

		// Save the entry point script
		console.log('\nWriting to ' + process.cwd() + '/' + ENTRY_POINT_FILENAME);
		fs.writeFileSync(ENTRY_POINT_FILENAME, entry_js);
		console.log('Writing has been completed.\n\n');

		return true;

	}).then(function (result) {

		// Generate the commands handler script
		handler_js = generateCodeHandlerJs(config);

		// Preview of the commands handler script
		console.log(handler_js);

		// Confirm to user
		return inquirer.prompt([{
			type: 'confirm',
			name: 'confirmSaveHandlerJs',
			message: 'The commands handler was generated. Would you write it to ' + HANDLER_FILENAME + ' ?'
		}]);

	}).then(function (answer) {

		if (!answer.confirmSaveHandlerJs) {
			handler_js = null;
			return false;
		}

		// Save the commands handler script
		console.log('\nWriting to ' + process.cwd() + '/' + HANDLER_FILENAME);
		fs.writeFileSync(HANDLER_FILENAME, handler_js);
		console.log('Writing has been completed.\n\n');

		return true;

	}).then(function (result) {

		// Generate the package.json
		package_json = generatePackageJson(config);
		if (package_json == null) { // If user's package.json exists and invalid
			// Skip
			return { answer: { confirmSavePackageJson: false} };
		}

		// Preview of the package.json
		console.log(package_json + '\n');

		// Confirm to user
		return inquirer.prompt([{
			type: 'confirm',
			name: 'confirmSavePackageJson',
			message: 'The package.json was generated. Would you write it to package.json ?'
		}]);

	}).then(function (answer) {

		if (!answer.confirmSavePackageJson) {
			package_json = null;
			return false;
		}

		// Save the commands handler script
		console.log('\nWriting to ' + process.cwd() + '/package.json');
		fs.writeFileSync('package.json', package_json);
		console.log('Writing has been completed.\n\n');
		return true;

	}).then(function () {

		console.log(colors.bold.green('\nAll was completed.'));

		if (!entry_js && !handler_js) {
			console.log('');
			process.exit(0);
			return;
		}

		// Show the guide
		console.log(colors.bold('Enjoy :)'));
		console.log('\n$ npm install');
		console.log('$ npm start -- --development\n');
		console.log('For details, please refer to https://github.com/odentools/denhub-device/\n');

	});

}


/**
 * Generate the source code for entory point
 * @param  {Object} config Device configuration
 * @return {String}        Source code
 */
function generateCodeEntryJs (config) {

	// Read the entry point script
	var entry_js = null;
	try {
		// Read from current script
		entry_js = fs.readFileSync(ENTRY_POINT_FILENAME).toString();
	} catch (e) {
		// Read from template script
		entry_js = fs.readFileSync(__dirname + '/../templates/' + ENTRY_POINT_FILENAME + '.tmpl').toString() + '\n';
	}

	return entry_js;

}


/**
 * Generate the source code for commands handler
 * @param  {Object} config Device configuration
 * @return {String}        Source code
 */
function generateCodeHandlerJs (config) {

	// Read the handler script
	var handler_js = null;
	try {
		// Read from current script
		handler_js = fs.readFileSync(HANDLER_FILENAME).toString();
	} catch (e) {
		// Read from template script
		handler_js = fs.readFileSync(__dirname + '/../templates/' + HANDLER_FILENAME + '.tmpl').toString();
	}

	// Iterate the each commands
	for (var cmd_name in config.commands) {

		if (!cmd_name.match(/^[a-zA-Z][a-zA-Z0-9]+$/)) {
			throw new Error('Defined method name is invalid format: ' + cmd_name);
		}

		if (handler_js.indexOf(cmd_name) != -1) { // handler for this command was written
			continue; // skip
		}

		// Make a handler for this command
		var cmd = config.commands[cmd_name];
		var js_func = '\n\n\
/**\n\
* %cmdDescription%\n\
* @param  {Object} args         Arguments of the received command\n\
* @param  {Function} cb_runner  Callback runner for response\n\
* @return {Boolean} if returns true, handler indicates won\'t use the callback \n\
*/\n\
CommandsHandler.prototype.' + cmd_name + ' = function (args, cb_runner) {\n\
\t\n';

		// To align the line length of argument examples
		var cmd_args = cmd.arguments || cmd.args || [];
		var longest_length_of_arg_name = 0;
		for (var name_ in cmd_args) {
			if (longest_length_of_arg_name < name_.length) longest_length_of_arg_name = name_.length;
		}

		// Generate the argument examples
		for (var name in cmd_args) {

			// Generate an example
			var line = '\tthis.logger.log(args.' + name + ');';

			// Generate a comment
			var comment_spaces = new String(' ');
			for (var i = 0, l = longest_length_of_arg_name - name.length; i < l; i++) {
				comment_spaces += ' ';
			}
			var comment = '// ' + cmd_args[name];

			js_func += line + comment_spaces + comment + '\n';

		}

		if (0 < Object.keys(cmd_args).length) {
			js_func += '\t\n';
		}

		js_func += '\tcb_runner.send(null, \'OKAY\');\n\t\n\};\n';

		// Replace the command placeholders of the commands handler script
		js_func = js_func.replace(/\%cmdName\%/g, cmd_name);
		if (cmd.description) {
			js_func = js_func.replace(/\%cmdDescription\%/g, cmd.description);
		}

		// Done
		handler_js += js_func;

	}

	// Replace the placeholders (e.g. %deviceType%) of whole of commands handler script
	for (var config_key in config) {
		handler_js = handler_js.replace(new RegExp('\\%' + config_key + '\\%', 'g'), config[config_key]);
	}

	// Append the module.exports
	if (!handler_js.match(/module\.exports = CommandsHandler;/)) {
		handler_js += '\n\nmodule.exports = CommandsHandler;\n';
	}

	return handler_js;

}


/**
 * Generate the package.json
 * @param  {Object} config Device configuration
 * @return {String}        JSON code
 */
function generatePackageJson (config) {

	// Read the user's package.json
	var user_file;
	try {
		// Read from current file
		user_file = fs.readFileSync('./package.json').toString();
	} catch (e) {
		user_file = null;
	}

	// Parse the user's package.json
	var user_json = null;
	if (user_file) {
		try {
			user_json = JSON.parse(user_file);
		} catch (e) {
			console.log(colors.bold.red('Your package.json was invalid!\n\
	We skipped the merging of your package.json with template.'));
			console.log(user_json);
			return null;
		}
	} else {
		user_json = {};
	}

	// Read the template package.json
	var tmpl_file = fs.readFileSync(__dirname + '/../templates/package.json.tmpl').toString();

	// Replace the placeholders (e.g. %deviceType%) of whole of template
	for (var config_key in config) {
		tmpl_file = tmpl_file.replace(new RegExp('\\%' + config_key + '\\%', 'g'), config[config_key]);
	}
	tmpl_file = tmpl_file.replace(new RegExp('\\%libVersion\\%', 'g'), helper.getPackageInfo().version);

	// Parse the template package.json
	var tmpl_json = null;
	try {
		tmpl_json = JSON.parse(tmpl_file);
	} catch (e) {
		console.error('Could not parse the template file:\n' + tmpl_file + '\n' + e.stack.toString());
		process.exit(0);
	}

	// Merge the fields with template package.json
	for (var key in tmpl_json) {
		if (user_json[key] == null) {
			user_json[key] = tmpl_json[key];
		} else if (helper.isType(user_json[key], 'Object')) {
			for (var key_ in tmpl_json[key]) {
				if (user_json[key][key_] == null) user_json[key][key_] = tmpl_json[key][key_];
			}
		}
	}

	// Done
	return JSON.stringify(user_json,  null, '  ');

}
