/**
 * HandlerLogger - A logger for CommandsHandler
 * https://github.com/odentools/denhub-device
 * (C) 2016 - OdenTools; Released under MIT License.
 */

'use strict';


/**
 * Constructor
 * @param {DenHubDevice} device  Instance of DenHubDevice
 */
var HandlerLogger = function (device) {

	this.device = device;

};


/**
 * Print a debug log
 * @param  {Object} obj   Log item
 */
HandlerLogger.prototype.log = function (obj) {

	this.device.logDebug('CommandsHandler', obj);

};


/**
 * Print a debug log
 * @param  {Object} obj   Log item
 */
HandlerLogger.prototype.debug = function (obj) {

	this.device.logDebug('CommandsHandler', obj);

};


/**
 * Print a information log
 * @param  {Object} obj   Log item
 */
HandlerLogger.prototype.info = function (obj) {

	this.device.logInfo('CommandsHandler', obj);

};


/**
 * Print a warning log
 * @param  {Object} obj   Log item
 */
HandlerLogger.prototype.warn = function (obj) {

	this.device.logWarn('CommandsHandler', obj);

};


/**
 * Print a error log
 * @param  {Object} obj   Log item
 */
HandlerLogger.prototype.error = function (obj) {

	this.device.logError('CommandsHandler', obj);

};


// ----

module.exports = HandlerLogger;
