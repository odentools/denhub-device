# denhub-device

The Device Daemon Kit for [Denhub](https://github.com/odentools/denhub) platform.
It includes the generator for create your daemon.

This project is alpha testing phase.

[![Build Status](https://travis-ci.org/odentools/denhub-device.svg?branch=master)](https://travis-ci.org/odentools/denhub-device)
[![npm](https://img.shields.io/npm/v/denhub-device.svg?maxAge=2592000)](https://www.npmjs.com/package/denhub-device)

## Get Started

NOTE: If you don't have [denhub-server](https://github.com/odentools/denhub-server),
please create your server before you trying to run the following steps.

	$ sudo npm install -g denhub-device


	$ mkdir ~/car-0
	$ cd ~/car-0/


	$ denhub-device-generator --init
	? deviceName ? car-0
	? deviceType ? car
	? deviceToken ? (Press the Enter key remains empty)
	? denhubServerHost ? wss://YOUR-DENHUB-SERVER.herokuapp.com/

	? The configuration file was generated. Would you write it to config.json ? Yes

	? The commands file was not found. Would you write the example to commands.json ? Yes

	? Would you generate the source code now ? No


	$ vim commands.json
	{
		"setMotorPower": {
			"description": "Set the motor power",
			"args": {
				"left": "INTEGER(0,255) DEFAULT 0",
				"right": "INTEGER(0,255) DEFAULT 0"
			}
		}
	}


	$ denhub-device-generator

	? The entry point was generated. Would you write it to index.js ? Yes

	? The commands handler was generated. Would you write it to handler.js ? Yes

	? The package.json was generated. Would you write it to package.json ? Yes


	$ npm install


Run the daemon as development mode:

	$ npm start -- --development

Run the daemon as production mode:

	$ npm start


## Principal Files

### commands.json

It describes the commands for your device.

It also define a specification of the each values with using [S-Spec](https://github.com/odentools/s-spec) format for validation.

Format:
```
{
	"COMMAND-NAME": {
		"description": "DESCRIPTION-OF-COMMAND",
		"args": {
			"VALUE-NAME": "S-SPEC-FORMAT",
			...
		}
	},
	...
}
```

### handler.js

It describes an event handler for the each commands.

You can generate the scaffold for handler.js from commands.json using ``denhub-device-generator`` command.

### config.json

It describes the configurations for your device.
Also, your command handler can be read those configurations.

https://github.com/odentools/denhub-device/wiki/Operation-config.json


## About Command Module
In denhub-device, your commands definition and command handler can be put together to a new package and publish it.
Please refer to the [wiki page](https://github.com/odentools/denhub-device/wiki/Dev-CommandModule) for details.

Also you can find the command module on npm:
https://www.npmjs.com/browse/keyword/denhub-device


## Licenses

```
The MIT License (MIT).
Copyright (c) 2016 OdenTools Project.
```
