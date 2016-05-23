/**
 * HandlerHelper - A helper for CommandsHandler
 * https://github.com/odentools/denhub-device
 * (C) 2016 - OdenTools; Released under MIT License.
 */

'use strict';


/**
 * Constructor
 * @param {DenHubDevice} device  Instance of DenHubDevice
 */
var HandlerHelper = function (device) {

	this.device = device;

};


/**
 * Get an instance of the denhub device plugin
 * @param  {String} plugin_name  Name of the plugin
 * @return  {Object} Initialized instance of the plugin
 */
HandlerHelper.prototype.getPlugin = function (plugin_name) {

	var self = this;

	return self.device.getPlugin(plugin_name) || null;

};


// ----

module.exports = HandlerHelper;
