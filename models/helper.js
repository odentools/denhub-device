'use strict';

var colors = require('colors');

var packageInfo = null;

module.exports = {


	/**
	 * Read the package information
	 * @return {Object} Package information
	 */
	getPackageInfo: function () {

		if (packageInfo) return packageInfo;

		var fs = require('fs');
		packageInfo = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8'));

		return packageInfo;

	},


	/**
	 * Get the local connected ipv4 address of the device
	 * @return {String} IP address
	 */
	getIPv4Address() {

		var nics = require('os').networkInterfaces(), nic_name = null, i = 0, nic_ips = null, nic = null;

		for (nic_name in nics) {

			if (!nic_name.match(/^wlan.*/) && !nic_name.match(/^eth.*/)) continue;

			nic_ips = nics[nic_name];
			for (i = 0; i < nic_ips.length; i++) {
				nic = nic_ips[i];
				if (nic.family == 'IPv4' && nic.mac != '00:00:00:00:00:00') return nic.address;
			}
		}

		for (nic_name in nics) {
			nic_ips = nics[nic_name];
			for (i = 0; i < nic_ips.length; i++) {
				nic = nic_ips[i];
				if (nic.family == 'IPv4' && nic.mac != '00:00:00:00:00:00') return nic.address;
			}
		}

		return null;

	},


	/**
	 * Read the configuration file
	 * @return {Object} Configuration file
	 */
	getConfig: function (is_ignore_errors, opt_config_filename) {

		var config_paths = [];
		if (opt_config_filename) {
			config_paths.push(opt_config_filename);
		} else {
			// root of denhub-device directory
			config_paths.push(__dirname + '/../config.json');
			// root of dependence source directory
			config_paths.push('./config.json');
		}

		var config_file = null;
		for (var i = 0, l = config_paths.length; i < l; i++) {
			try {
				config_file = require('fs').readFileSync(config_paths[i]);
			} catch (e) {
				continue;
			}
			if (config_file) break;
		}

		if (!config_file && !is_ignore_errors) {
			console.log(colors.bold.red('Error: Could not read the configuration file.'));
			console.log(config_paths.join('\n'));
			console.log(colors.bold('If you never created it, please try the following command:'));
			console.log('$ denhub-device-generator --init\n');
			process.exit(255);
		}

		var config = {};
		if (config_file) {
			try {
				config = JSON.parse(config_file);
			} catch (e) {
				if (!is_ignore_errors) throw e;
			}
		}

		return config;
	},


	/**
	 * Conver the string to upper case
	 * @return {String} Converted string
	 */
	toUpperCase: function (str) {

		var self = this;

		if ('i' !== 'I'.toLowerCase()) {
			// Thanks for http://qiita.com/niusounds/items/fff91f3f236c31ca910f
			return str.replace(/[a-z]/g, function(ch) {
				return String.fromCharCode(ch.charCodeAt(0) & ~32);
			});
		}

		return str.toUpperCase();

	},

	
	/**
	 * Whether the variable type is matched with the specified variable type
	 * @param  {Object}  obj      Target variable
	 * @param  {String}  var_type Expected variable type
	 * @return {Boolean}          Whether the type is matched
	 */
	isType: function (obj, var_type) {

		var text_class = Object.prototype.toString.call(obj).slice(8, -1);
		return (text_class == var_type);

	}


};
