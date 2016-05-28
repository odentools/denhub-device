/**
 * Test Script for denhub-device with CommandsHandler
 */

var assert = require('assert'),
	DenHubDevice = require(__dirname + '/../denhub-device.js');

// Make a commands handler
var CommandsHandler = function (config, logger, helper) {
	this.config = config;
	this.logger = logger;
	this.kvs = helper.getPlugin('_kvs');
	console.log(helper);
};

CommandsHandler.prototype.testWithoutCallback = function (args, cb_runner) {
	// Don't send a response by handler
	return true; //  It will send a response automatically by DenHubDevice instance
};

CommandsHandler.prototype.testWithCallback = function (args, cb_runner) {
	// Send a response
	cb_runner.send(null, 'OKAY');
};

CommandsHandler.prototype.testSendLog = function (args, cb_runner) {
	// Send a debug log to the server
	this.logger.log('HELLO');
	return true;
};

CommandsHandler.prototype.testSetKVs = function (args, cb_runner) {
	// Save an item to the KVS
	this.kvs.set('foo', 'bar', function (error) {
		if (error) throw error;
	});
	return true;
};

// Make an instance of DenHubDevice
var denhubDevice = new DenHubDevice(CommandsHandler, {
	deviceName: 'test-device-0',
	deviceType: 'test-device',
	deviceToken: 'abcdefghijklmnopqrstuvwxyz12345678901234567890123456789012345678',
	denhubServerHost: 'ws://localhost:8080/',
	isDebugMode: true,
	isSuppressLog: true,
	commands: {
		testWithoutCallback: {
			description: 'Test method 1'
		},
		testWithCallback: {
			description: 'Test method 2'
		},
		testSendLog: {
			description: 'Test method 3'
		},
		testSetKVs: {
			description: 'Test method 4'
		}
	}
});

// Start a websocket server for testing
var WebSocketServer = require('ws').Server,
	wsServer = new WebSocketServer({ port: 8080 }), wsCon = null;
wsServer.on('connection', function (ws) {
	wsCon = ws;
	wsCon.on('message', function (message) {
		console.log('[TEST] Server / Message received', message);
	});
});


// ----


describe('Initialization', function () {

	it('Start the device daemon', function (done) {

		denhubDevice.start(function (err, ws) {

			if (err) throw err;

			console.log('Device daemon started');
			done();

		});

	});

});


describe('Command Receiving', function () {

	it('Call a Command Handler without callback', function (done) {

		// Listen the response from testWithoutCallback handler of the device
		wsCon.on('message', function (message) {

			var data = JSON.parse(message);
			if (data.cmd != '_sendCmdResponse' || data.args.sourceCmd != 'testWithoutCallback') return;

			done();

		});

		// Make a request to execute the testWithoutCallback
		wsCon.send(JSON.stringify({
			cmd: 'testWithoutCallback'
		}));

	});

	it('Call a Command Handler without callback', function (done) {

		// Listen the response from testWithCallback handler of the device
		wsCon.on('message', function (message) {

			var data = JSON.parse(message);
			if (data.cmd != '_sendCmdResponse' || data.args.sourceCmd != 'testWithCallback') return;

			assert.equal(data.args.responseSuccess, 'OKAY');

			done();

		});

		// Make a request to execute the testWithCallback
		wsCon.send(JSON.stringify({
			cmd: 'testWithCallback'
		}));

	});

});


describe('Logging', function () {

	it('Send a debug log from handler', function (done) {

		// Listen the log from testSendLog handler of the device
		wsCon.on('message', function (message) {

			var data = JSON.parse(message);
			if (data.cmd != '_sendLog' || data.args.text != 'HELLO') return;

			done();

		});

		// Make a request to execute the testSendLog
		wsCon.send(JSON.stringify({
			cmd: 'testSendLog'
		}));

	});

});


describe('Plugin', function () {

	it('core - kvs', function (done) {

		// Listen the log from testSendLog handler of the device
		wsCon.on('message', function (message) {

			var data = JSON.parse(message);
			if (data.cmd != '_setKvs' || data.args.key != 'foo') return;

			done();

		});

		// Make a request to execute the testSetKVs
		wsCon.send(JSON.stringify({
			cmd: 'testSetKVs'
		}));

	});

});
