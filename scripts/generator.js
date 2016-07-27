#!/usr/bin/env node
/**
 * Generator for Denhub-Device
 * https://github.com/odentools/denhub-device
 * (C) 2016 - OdenTools; Released under MIT License.
 */

'use strict';

var minimist = require('minimist'), inquirer = require('inquirer'),
	fs = require('fs'), colors = require('colors'),
	SSpecParser = require('s-spec/models/parser');

var helper = require(__dirname + '/../models/helper');

var CONFIG_FILENAME = 'config.json', COMMANDS_FILENAME = 'commands.json',
	ENTRY_POINT_FILENAME = 'index.js', HANDLER_FILENAME = 'handler.js';


// Print the header
var ver = helper.getPackageInfo().version;
console.log('\n>> Denhub-Device Generator v' + ver + ' <<\n\
(C) 2016 - Denhub Project & OdenTools\n\
--------------------------------------------------\n');

// Parse the arguments
var argv = minimist(process.argv.slice(2));
var config = {};
var is_all_yes = argv.yes || argv.y || false;

if (argv._[0] == 'init') { // Manifest Generator Mode

	// Read the configuration file
	config = helper.getConfig(true); // Allow the incomplete configuration file

	// Run the Configuration Generator and the Code Generator
	generateConfig(config, is_all_yes);

} else if (argv._[0] == 'commands') { // Command editor mode

	// Read the configuration file
	config = helper.getConfig(true);

	// Run the Command Editor
	startCmdEditor(config);

} else if (argv._[0] == 'help' | argv.help | argv.h) { // Help mode

	printHelp();

} else if (argv._[0] == 'version' | argv.version) { // Version info mode

	process.exit(0);

} else {

	// Read the configuration file
	config = helper.getConfig(false);

	// Run the Code Generator
	generateCode(config, is_all_yes);

}


// ----


/**
 * Generate the configuration file
 * @param  {Object} old_config Current configuration
 * @param  {Boolea} is_all_yes  Whether the response will choose yes automatically
 */
function generateConfig (old_config, is_all_yes) {

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

		// Clone the configuration object
		var save_config = JSON.parse(JSON.stringify(old_config || {}));
		for (var key in answer) {
			config[key] = answer[key];
			save_config[key] = answer[key];
		}
		if (save_config.commands) {
			delete save_config.commands;
		}

		// Preview of the configuration file
		var formatted_json = JSON.stringify(save_config,  null, '    ');
		console.log('\n\n' + formatted_json + '\n');

		// To next step
		var promise = null;
		if (is_all_yes) {
			promise = new Promise(function (resolve, reject) {
				resolve({
					isSaveConfig: true
				});
			});
		} else {
			// Confirmation for save the configuration file
			promise = inquirer.prompt([{
				type: 'confirm',
				name: 'isSaveConfig',
				message: 'The configuration file was generated. Would you write it to ' + CONFIG_FILENAME + ' ?'
			}]);
		}

		promise.then(function (answer) {

			if (!answer.isSaveConfig) return false;

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
					isSaveCommands: false
				};
			}

			console.log(commands_tmpl);

			// To skip mode
			if (is_all_yes) return {isSaveCommands: true};

			// Confirm to user
			return inquirer.prompt([{
				type: 'confirm',
				name: 'isSaveCommands',
				message: 'The commands file was not found. Would you write the example to ' + COMMANDS_FILENAME + ' ?'
			}]);

		}).then(function (answer) {

			if (!answer.isSaveCommands) return false;

			// Save the commands file
			console.log('\nWriting to ' + process.cwd() + '/' + COMMANDS_FILENAME);
			fs.writeFileSync(COMMANDS_FILENAME, commands_tmpl);
			console.log('Writing has been completed.\n\n');

			return true;

		}).then(function (is_wrote) {

			// To skip mode
			if (is_all_yes) return {isGenerateCode: true};

			// Confirmation for continue
			return inquirer.prompt([{
				type: 'confirm',
				name: 'isGenerateCode',
				message: 'Would you generate the source code now ?'
			}]);

		}).then(function (answer) {

			if (!answer.isGenerateCode) {
				console.log(colors.bold.green('\nAll was completed :)'));
				return;
			}

			console.log('\n');

			// Generate the source code of the device
			config.commands = old_config.commands || {};
			generateCode(config, is_all_yes);

		});

	});

}


/**
 * Generate the source code for device daemon
 * @param  {Object} config      Device configuration
 * @param  {Boolea} is_all_yes  Whether the response will choose yes automatically
 */
function generateCode (config, is_all_yes) {

	console.log(colors.bold('--------------- Code Generator ---------------\n'));

	// Check the configuration
	if (!config.commands) {
		throw new Error('commands undefined in your config.js');
	}

	// Start the processes
	var entry_js = null, handler_js = null, package_json = null, is_modules_installed = false;
	Promise.resolve()
	.then(function () {

		// Generate the entry point script
		entry_js = generateCodeEntryJs(config);

		// Preview of the entry point script
		console.log(entry_js);

		// To skip mode
		if (is_all_yes) return {isSaveEntryJs: true};

		// Confirm to user
		return inquirer.prompt([{
			type: 'confirm',
			name: 'isSaveEntryJs',
			message: 'The entry point was generated. Would you write it to ' + ENTRY_POINT_FILENAME + ' ?'
		}]);

	}).then(function (answer) {

		if (!answer.isSaveEntryJs) {
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

		// To skip mode
		if (is_all_yes) return {isSaveHandlerJs: true};

		// Confirm to user
		return inquirer.prompt([{
			type: 'confirm',
			name: 'isSaveHandlerJs',
			message: 'The commands handler was generated. Would you write it to ' + HANDLER_FILENAME + ' ?'
		}]);

	}).then(function (answer) {

		if (!answer.isSaveHandlerJs) {
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
			return { answer: { isSavePackageJson: false} };
		}

		// Preview of the package.json
		console.log(package_json + '\n');

		// To skip mode
		if (is_all_yes) return {isSavePackageJson: true};

		// Confirm to user
		return inquirer.prompt([{
			type: 'confirm',
			name: 'isSavePackageJson',
			message: 'The package.json was generated. Would you write it to package.json ?'
		}]);

	}).then(function (answer) {

		if (!answer.isSavePackageJson) {
			package_json = null;
			return false;
		}

		// Save the commands handler script
		console.log('\nWriting to ' + process.cwd() + '/package.json');
		fs.writeFileSync('package.json', package_json);
		console.log('Writing has been completed.\n\n');
		return true;

	}).then(function (result) {

		// Confirm to whether the dependency modules are installed
		var dir_list = [];
		try {
			dir_list = fs.readdirSync('./node_modules/');
		} catch (e) {
			dir_list = [];
		}

		is_modules_installed = false;
		dir_list.forEach(function (name, i) {
			if (name == 'denhub-device') {
				is_modules_installed = true;
			}
		});

		if (is_modules_installed || is_all_yes) {
			return {isDependencyInstall: false};
		}

		// Confirm to user
		return inquirer.prompt([{
			type: 'confirm',
			name: 'isDependencyInstall',
			message: 'The required modules are not installed. Would you install it now ?'
		}]);

	}).then(function (answer) {

		if (!answer.isDependencyInstall) {
			return false;
		}

		// Install the dependency modules
		is_modules_installed = true;
		return execDependencyInstall();

	}).then(function (result) {

		console.log(colors.bold.green('All was completed.'));

		if (!entry_js && !handler_js) {
			console.log('');
			process.exit(0);
			return;
		}

		// Show the guide
		console.log(colors.bold('Enjoy :)\n'));
		if (!is_modules_installed) console.log('$ npm install');
		console.log('$ npm start -- --dev\n');
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


/**
 * Install the dependency modules with using npm command
 * @return {Boolean} Whether the install has been successful
 */
function execDependencyInstall () {

	console.log('\nExecuting npm install command...');

	return new Promise(function(resolve, reject){

		var child = require('child_process').spawn('npm', ['install'], {
			cwd: process.cwd,
			detached: false,
			env: process.env,
			stdio: [process.stdin, process.stdout, process.stderr]
		});

		child.on('error', function (error) {
			console.error(colors.bold.red('ERROR: Could not install the required modules:'));
			console.error(error.stack.toString());
			process.exit(255);
		});

		child.on('close', function (exit_code) {
			if (exit_code !== 0) {
				console.error(colors.bold.red('\nERROR: npm install has been failed.'));
				process.exit(255);
			}
			console.log('\nnpm install has been completed.\n\n');
			resolve(true);
		});

	});

}


/**
 * Start the command editor
 * @param  {Object} config             Current configuration
 * @param  {Boolean} is_skip_header    Whether the header should be skipped
 */
function startCmdEditor (config, is_skip_header) {

	if (!is_skip_header) {
		console.log(colors.bold('--------------- Command Editor ---------------'));
	}

	// Show a prompt for choose the mode
	var promise = inquirer.prompt([{
		type: 'list',
		name: 'mode',
		message: 'What you want to do ?',
		choices: [
			'Show commands list', 'Add new command', 'Edit command', 'Delete command'
		]
	}]);

	promise.then(function (answer) {

		var mode = answer.mode;
		var promise = null;

		if (mode == 'Add new command') {
			promise = addCommandOnCmdEditor(config);
		} else if (mode == 'Edit command') {
			promise = editCommandOnCmdEditor(config);
		} else if (mode == 'Delete command') {
			promise = deleteCommandOnCmdEditor(config);
		} else if (mode == 'Show commands list') {
			promise = showCommandsOnCmdEditor(config);
		}

		if (!promise) {
			startCmdEditor(config, true);
			return;
		}

		promise.then(function () {
			startCmdEditor(config, true);
		});

	});

}


/**
 * Command Editor - Show a list of the commands
 * @param  {Object} config             Current configuration
 * @return {Promise}
 */
function showCommandsOnCmdEditor (config) {

	console.log(colors.bold('\nAvailable Commands for ' + config.deviceName + ':\n'));

	// Iterate the each commands
	var commands = config.commands || {};
	if (Object.keys(commands).length == 0) {
		console.log ('\nThere is no command.');
	} else {
		for (var name in commands) {
			var desc = commands[name].description || '';
			console.log(colors.bold('\n' + name + '') + '\n  ' + desc + '\n');

			// Iterate the each arguments
			var args = commands[name].args || {};
			if (Object.keys(args).length == 0) {
				console.log ('\tThe arguments of this command are not defined');
			} else {
				for (var arg_name in args) {
					var arg_spec = args[arg_name] || '';
					console.log('\t* ' + arg_name + ' - ' + arg_spec);
				}
			}

		}
	}

	console.log('\n');

	// Done
	return new Promise(function (resolve, reject) {
		resolve();
	});

}


/**
 * Command Editor - Add a command
 * @param  {Object} config             Current configuration
 * @return {Promise}
 */
function addCommandOnCmdEditor (config) {

	var cmd_name = null;

	var promise = inquirer.prompt([{
		type: 'input',
		name: 'cmdName',
		message: 'What is name of a command (e.g. setMotorPower) ?',
		validate: function (value) {
			if (value.length == 0) return true;
			if (config.commands[value] != null) return 'This command name has already existed.';
			if (!value.match(/^[A-Za-z0-9_]+$/)) return 'Available characters for argument name: A-Z, a-z, 0-9, underscore.\n\
Or, if you want to cancel, please press the enter key left empty.';
			return true;
		}

	}]).then(function (answer) {

		cmd_name = answer.cmdName || null;
		if (cmd_name == null || cmd_name.length == 0) {
			return null;
		}

		return inquirer.prompt([{
			type: 'input',
			name: 'cmdDesc',
			message: 'What is description of ' + cmd_name + ' command ?'
		}]);


	}).then(function (answer) {

		if (cmd_name == null) return false;

		var commands = config.commands || {};
		commands[cmd_name] = {
			description: answer.cmdDesc || null,
			args: {}
		};

		// Done
		console.log(colors.bold.green('This command has been created: ' + cmd_name));

		// Save to the commands file
		console.log('\nWriting to ' + process.cwd() + '/' + COMMANDS_FILENAME);
		fs.writeFileSync(COMMANDS_FILENAME, JSON.stringify(config.commands));
		console.log('Writing has been completed.\n\n');
		return true;

	});

	return promise;

}


/**
 * Command Editor - Delete a command
 * @param  {Object} config             Current configuration
 * @return {Promise}
 */
function deleteCommandOnCmdEditor (config) {

	var commands = config.commands || {};
	var command_names = Object.keys(commands);
	command_names.unshift('<< Cancel');

	var promise = inquirer.prompt([{
		type: 'list',
		name: 'cmdName',
		message: 'Choose the command you want to delete',
		choices: command_names
	}]);

	return promise.then(function (answer) {

		if (answer.cmdName == '<< Cancel') {
			return false;
		}

		delete config.commands[answer.cmdName];

		// Done
		console.log(colors.bold.green('\n\nThis command has been deleted: ' + answer.cmdName));

		// Save to the commands file
		console.log('\nWriting to ' + process.cwd() + '/' + COMMANDS_FILENAME);
		fs.writeFileSync(COMMANDS_FILENAME, JSON.stringify(config.commands));
		console.log('Writing has been completed.\n\n');

		return true;

	});

}


/**
 * Command Editor - Edit a command
 * @param  {Object} config             Current configuration
 * @return {Promise}
 */
function editCommandOnCmdEditor (config) {

	var commands = config.commands || {};
	var command_names = Object.keys(commands);
	command_names.unshift('<< Cancel');

	var promise = inquirer.prompt([{
		type: 'list',
		name: 'cmdName',
		message: 'Choose the command you want to edit',
		choices: command_names
	}]);

	var cmd_name = null;

	return promise.then(function (answer) {

		if (answer.cmdName == '<< Cancel') {
			return new Promise(function (resolve, reject) {
				resolve({editTarget: '<< Cancel'});
			});
		}

		cmd_name = answer.cmdName;

		var arg_name = null;
		var choices = ['<< Cancel', 'Edit command description', 'Add argument'];
		for (arg_name in config.commands[cmd_name].args || {}) {
			choices.push('Edit argument - ' + arg_name);
		}
		for (arg_name in config.commands[cmd_name].args || {}) {
			choices.push('Delete argument - ' + arg_name);
		}

		return inquirer.prompt([{
			type: 'list',
			name: 'editTarget',
			message: 'What you want to do for ' + cmd_name + ' ?',
			choices: choices
		}]);


	}).then(function (answer) {

		if (answer.editTarget == '<< Cancel') return false;

		if (answer.editTarget == 'Edit command description') {

			// Edit the command description
			return inquirer.prompt([{
				type: 'input',
				name: 'cmdDesc',
				message: 'command description of ' + cmd_name + ' ?',
				default: config.commands[cmd_name].description || null
			}]);

		} else if (answer.editTarget == 'Add argument') {

			return editArgumentOnCmdEditor(config, cmd_name, null);

		} else if (answer.editTarget.match(/^Edit argument - (\S+)$/)) {

			return editArgumentOnCmdEditor(config, cmd_name, RegExp.$1);

		} else if (answer.editTarget.match(/^Delete argument - (\S+)$/)) {

			// Delete the argument
			return {deleteArgName: RegExp.$1};

		}


	}).then(function (answer) {

		if (!answer) return;

		if (answer.cmdDesc) { // Edit description of the command
			config.commands[cmd_name].description = answer.cmdDesc || null;
		}

		var arg_spec = null;
		if (answer.argName && answer.argType) { // Add an argument

			// Make a S-Spec specification
			arg_spec = answer.argType;

			// Make a S-Spec specification - Limit of range
			if (answer.min && answer.max) {
				arg_spec += '(' + answer.min + ',' + answer.max + ')';
			} else if (answer.max) {
				arg_spec += '(' + answer.max + ')';
			}

			// Make a S-Spec specification - Default value
			if (answer.default) {
				if (answer.argType == 'STRING' || answer.argType == 'TEXT') {
					arg_spec += ' DEFAULT ' + '\'' + answer.default + '\'';
				} else {
					arg_spec += ' DEFAULT ' + answer.default;
				}
			}

			// Make a S-Spec specification - Regex expression
			if (answer.regExp) {
				if (answer.argType == 'STRING' || answer.argType == 'TEXT') {
					answer.regExp = answer.regExp.replace(new RegExp(/\'/, 'g'), '\\\'');
					arg_spec += ' REGEXP ' + '\'' + answer.regExp + '\'';
				}
			}

			// Set to the argument object
			if (!config.commands[cmd_name].args) config.commands[cmd_name].args = {};
			config.commands[cmd_name].args[answer.argName] = arg_spec;

			console.log(colors.bold.green('\n\nThis argument has been created: ' + answer.argName)
				+ ' - ' + arg_spec);
		}

		if (answer.deleteArgName) { // Delete an argument

			arg_spec = config.commands[cmd_name].args[answer.deleteArgName] || '';
			delete config.commands[cmd_name].args[answer.deleteArgName];

			console.log(colors.bold.green('\n\nThis argument has been deleted: ' + answer.deleteArgName
				+ ' - ' + arg_spec));

		}

		// Save to the commands file
		console.log('\nWriting to ' + process.cwd() + '/' + COMMANDS_FILENAME);
		var json = JSON.stringify(config.commands, null, '    ');
		fs.writeFileSync(COMMANDS_FILENAME, json);
		console.log('Writing has been completed.\n\n');

	});

}


/**
 * Command Editor - Add / Edit an argument of the command
 * @param  {Object} config             Current configuration
 * @param  {String} cmd_name           Commane name
 * @param  {String} opt_arg_name       Argument name
 * @return {Promise}
 */
function editArgumentOnCmdEditor (config, cmd_name, opt_arg_name) {

	var ARG_TYPES = [
		'<< Cancel', 'BOOLEAN', 'FLOAT', 'INTEGER', 'NUMBER', 'STRING' //, 'TEXT'
	];

	// Prepare the required inputs
	var require_inputs = [];
	var arg = {};
	if (opt_arg_name) { // Edit the existed argument

		// Parse a specification of the existed argument
		arg.argName = opt_arg_name;
		var arg_spec = config.commands[cmd_name].args[opt_arg_name];
		try {
			var sspec = new SSpecParser(arg_spec);
			arg.argType = sspec.type;
			if (sspec.default != null) {
				arg.default = sspec.default.toString();
			} else {
				arg.default = null;
			}
			if (sspec.min != null) {
				arg.min = sspec.min.toString();
			} else {
				arg.min = null;
			}
			if (sspec.max != null) {
				arg.max = sspec.max.toString();
			} else {
				arg.max = null;
			}
			if (sspec.regExp != null) {
				var regexp_str = sspec.regExp.toString().replace(new RegExp('(^\/|\/$)', 'g'), '');
				regexp_str = regexp_str.replace(new RegExp('\\\\\'', 'g'), '\'');
				arg.regExp = regexp_str;
			} else {
				arg.regExp = null;
			}
		} catch (e) {
			arg.argType = null;
			arg.default = null;
			arg.min = null;
			arg.max = null;
			arg.regExp = null;
		}

		// Prepare the required inputs
		require_inputs = [
			{
				type: 'list',
				name: 'argType',
				default: arg.argType,
				message: 'Type of ' + arg.argName + ' ?',
				choices: ARG_TYPES
			}
		];

	} else { // Add a new argument

		require_inputs = [
			{
				type: 'input',
				name: 'argName',
				message: 'Name of a new argument (e.g. value) ?',
				validate: function (value) {
					if (value.length == 0 && !value.match(/^[A-Za-z0-9_]+$/)) return 'Available characters for argument name: A-Z, a-z, 0-9, underscore';
					return true;
				}
			},
			{
				type: 'list',
				name: 'argType',
				message: 'Type of a new argument ?',
				choices: ARG_TYPES
			}
		];

	}

	// Show the required inputs
	var promise = inquirer.prompt(require_inputs);

	// Additional processing
	return promise.then(function (answer) {

		// Process the answer of the required inputs
		arg.argName = answer.argName || arg.argName;
		arg.argType = answer.argType;

		// Prepare & Show the additional inputs
		var promise = null;
		if (answer.argType == 'BOOLEAN') {

			// Additional inputs for the string argument
			promise = inquirer.prompt([
				{
					type: 'input',
					name: 'default',
					message: 'Default value (Optional) ?',
					default: arg.default || null
				}
			]);

		} else if (answer.argType == 'STRING' || answer.argType == 'TEXT') {

			// Additional inputs for the string argument
			promise = inquirer.prompt([
				{
					type: 'input',
					name: 'default',
					message: 'Default value (Optional) ?',
					default: arg.default || null
				},
				{
					type: 'input',
					name: 'min',
					message: 'Minimum length (optional) ?',
					default: arg.min,
					validate: function (value) {
						if (value.toString().length != 0 && value.toString() != 'NULL' && !value.toString().match(/^[0-9]+$/)) {
							return 'Available characters for Minimum length: 0-9\n\
You can also disabled by to input a NULL.';
						}
						return true;
					}
				},
				{
					type: 'input',
					name: 'max',
					message: 'Maximum length (optional) ?',
					default: arg.max,
					validate: function (value) {
						if (value.toString().length != 0 && value.toString() != 'NULL' && !value.toString().match(/^[0-9]+$/)) {
							return 'Available characters for Maximum length: 0-9\n\
You can also disabled by to input a NULL.';
						}
						return true;
					}
				},
				{
					type: 'input',
					name: 'regExp',
					message: 'Regex Expression (optional) ?',
					default: arg.regExp,
					validate: function (value) {
						if (value.toString().length != 0 && value.toString() != 'NULL') {
							try {
								var exp = new RegExp(value);
							} catch (e) {
								return 'Entered regex expression are invalid.\n\
You can also disabled by to input a NULL.';
							}
						}
						return true;
					}
				}
			]);

		} else if (answer.argType == 'INTEGER' || answer.argType == 'NUMBER' || answer.argType == 'FLOAT') {

			// Additional inputs for the number argument
			promise = inquirer.prompt([
				{
					type: 'input',
					name: 'default',
					message: 'Default value (Optional) ?',
					default: arg.default,
					validate: function (value) {
						if (value.toString().length != 0 && value.toString() != 'NULL' && !value.toString().match(/^[0-9\.]+$/)) {
							return 'Available characters for Default value: 0-9, point\n\
You can also disabled by to input a NULL.';
						}
						return true;
					}
				},
				{
					type: 'input',
					name: 'min',
					message: 'Minimum value (optional) ?',
					default: arg.min,
					validate: function (value) {
						if (value.toString().length != 0 && value.toString() != 'NULL' && !value.toString().match(/^[0-9\.]+$/)) {
							return 'Available characters for Minimum value: 0-9, point\n\
You can also disabled by to input a NULL.';
						}
						return true;
					}
				},
				{
					type: 'input',
					name: 'max',
					message: 'Maximum value (optional) ?',
					default: arg.max,
					validate: function (value) {
						if (value.toString().length != 0 && value.toString() != 'NULL' && !value.toString().match(/^[0-9\.]+$/)) {
							return 'Available characters for Maximum value: 0-9, point\n\
You can also disabled by to input a NULL.';
						}
						return true;
					}
				}
			]);

		}

		return promise.then(function (answer) {

			if (answer.default && answer.default == 'NULL') answer.default = null;
			if (answer.min && answer.min == 'NULL') answer.min = null;
			if (answer.max && answer.max == 'NULL') answer.max = null;
			if (answer.regExp && answer.regExp == 'NULL') answer.regExp = null;

			// Return the created arguments
			return ({
				argName: arg.argName,
				argType: arg.argType,
				default: answer.default,
				min: answer.min,
				max: answer.max,
				regExp: answer.regExp
			});

		});

	});

}


/**
 * Print the help message
 */
function printHelp () {

	var help = 'denhub-device-generator MODE [-y|--yes] [-h|--help]\n\
\n\
MODE:\n\
\n\
	commands	Run the Command Editor\n\
	help		Print this help message\n\
	init		Run the Configuration Generator and the Code Generator\n\
	version		Print the version\n\
\n\
	If you not specified the MODE, the command runs only the Code Generator.\n\
\n\
\n\
OPTIONS:\n\
\n\
	-y, --yes \n\
	Respond yes to the all confirmation of the generators.\n\
	-h, --help \n\
	Print this help message. Alias of help mode.\n\
\n';

	console.log(help);

}
