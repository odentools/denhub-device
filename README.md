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


## About commands.json

It describes the commands and specification of values, with using [S-Spec](https://github.com/odentools/s-spec) format.

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


## About config.json

### denhubServerHost (Required)

An url of your [denhub-server](https://github.com/odentools/denhub-server).

Example:
```
"denhubServerHost": "wss://my-denhub.herokuapp.com/"
```

NOTE: If available, we recommended to use the "wss:" schema for secure connection.

HINT: If you don't have [denhub-server](https://github.com/odentools/denhub-server),
please try to creating your server. That will be finished right away.

### deviceName (Required)

Your device name.

Example:

```
"deviceName": "signage-entrance"
```

### deviceType (Required)

Example:

```
"deviceType": "signage"
```

### deviceToken

The device token that generated on your denhub-server.
Or, you can also be left empty this field.

Example:

```
"deviceToken": null
```

HINT: If this field is empty,
your server will be confirmed to whether to approve the device to you,
when the device has connected first time.
See details: [On-demand Approval Registration](https://github.com/odentools/denhub-server/wiki/Operation-Add-Devices) on denhub-server wiki.

## See Details

https://github.com/odentools/denhub-device/wiki


## Licenses

```
The MIT License (MIT).
Copyright (c) 2016 OdenTools Project.
```
