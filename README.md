# denhub-device

The Device Daemon Kit for [Denhub](https://github.com/odentools/denhub) platform.
It includes the generator for create your daemon.

This project is development phase.

[![Build Status](https://travis-ci.org/odentools/denhub-device?branch=master)](https://travis-ci.org/odentools/denhub-device)


## Get Started

NOTE: If you don't have [denhub-server](https://github.com/odentools/denhub-server),
please create your server before you trying to run the following steps.

	$ npm install -g denhub-device


	$ mkdir ~/car-0
	$ cd ~/car-0/


	$ denhub-device-generator --init
	? deviceName ? car-0
	? deviceType ? car
	? deviceToken ? (Press the Enter key remains empty)
	? denhubServerHost ? wss://YOUR-DENHUB-SERVER.herokuapp.com/

	? The configuration file was generated. Would you write it to config.json ? Yes

	? Would you generate the source code now ? No


	$ vim config.json
	{
		"commands": {
			"setMotorPower": {
				"description": "Set the motor power",
				"args": {
					"left": "INTEGER(0,255) DEFAULT 0",
					"right": "INTEGER(0,255) DEFAULT 0"
				}
			}
		}
	}


	$ denhub-device-generator

	? The entry point was generated. Would you write it to index.js ? Yes

	? The commands handler was generated. Would you write it to handler.js ? Yes


	$ npm init
	...
	entry point: (index.js) index.js
	...
	$ npm install --save denhub-device
	$ npm start


## About config.json

### denhubServerHost (Required)

An url of your [denhub-server](https://github.com/odentools/denhub-server).

Example:
```
"denhubServerHost": "wss://my-denhub.herokuapp.com/"
```

If you don't have [denhub-server](https://github.com/odentools/denhub-server),
please try to creating your server. That will be finished right away.

### commands (Required)

It describes the commands and specification of values, with using [S-Spec](https://github.com/odentools/s-spec) format.

Format:
```
"commands": {
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

TODO in Future: Command Editing with CLI

### deviceName (Required)

Your device name.

Example:

```
"deviceName": "rccar-0"
```

### deviceType (Required)

Example:

```
"deviceName": "rccar-0"
```

### deviceToken

The device token that generated on your denhub-server.
Or, you can also be left empty this field.

Example:

```
"deviceName": "rccar-0"
```

HINT: If this field is empty,
your server will be confirmed to whether to approve the device to you,
when the device has connected first time.
See details: [On-demand Approval Registration](https://github.com/odentools/denhub-server/wiki/Operation-Add-Devices) on denhub-server wiki.

## More Details

https://github.com/odentools/denhub-device/wiki


## Licenses

```
The MIT License (MIT).
Copyright (c) 2016 OdenTools Project.
```
