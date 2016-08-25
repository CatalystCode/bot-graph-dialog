# bot-graph-dialog
Graph Bot Dialog

**Note**

This is a quick&dirty code that was developed in 3 days during a hackfest.
Any use of this code it totally on your own responsibility.

Getting Started
================
```
var BotGraphDialog = require('bot-graph-dialog');

// these are optional, only provide if you're using subScenarios and/or custom handlers
var scenariosPath = path.join(__dirname, 'scenarios');
var handlersPath = path.join(__dirname, 'handlers');

// read scenario graph json
var stomachPainGraph = require('./scenarios/stomachPain.json');

// create graph dialog instance
var stomachPainGraphDialog = new BotGraphDialog({tree: stomachPainGraph, scenariosPath, handlersPath});

// attach stomach pain graph dialog to handle 'stomach' message
intents.matches(/^stomach/i, stomachPainGraphDialog.getSteps());

```


Sample Scenarios
================
[Here](examples)
