# bot-graph-dialog

This node module is an extension for Microsoft Bot Framework. 

Use this library to define graph-based dialogs instead of the waterfall dialogs supported today.
Also, instead of hard coding your dialogs, use this library to define your dialogs as jsons.
These dialogs can be loaded dynamically from any external data source (db, file system, etc.)

Code sample for how to use this library can be found [here](https://github.com/CatalystCode/bot-trees).


## Getting Started


### Usage

```
npm install [--save] bot-graph-dialog
```

### Code Sample

```js
var builder = require('botbuilder');
var BotGraphDialog = require('bot-graph-dialog');

var connector = new builder.ChatConnector({
    appId: '<microsoft_bot_id>',
    appPassword: '<microsoft_bot_password>',
  });
var bot = new builder.UniversalBot(connector);
var intents = new builder.IntentDialog();   
bot.dialog('/', intents);

// handler for loading scenarios from external datasource
function loadScenario(scenario) {
	return new Promise((resolve, reject) => {
		console.log('loading scenario', scenario);
		
		// implement loadScenario from external datasource.
		var scenarioObj = ...
		resolve(scenarioObj);  
	});
}

BotGraphDialog.GraphDialog
  .fromScenario({ 
    bot,
    scenario: '<scenarioName>', 
    loadScenario
  })
  // attach stomach pain graph dialog to handle 'stomach' message
  .then(graphDialog => intents.matches(/^stomach/i, graphDialog.getDialog()));

```

**See sample bot app [here](https://github.com/CatalystCode/bot-trees)**


## Sample Scenarios

Follow [these samples](examples/scenarios) as a reference to create your own scenarios.


## Schema Break Down

Each step\scenario in the schema is recursive.

* `id` - The id for the step
* `type` [required] - The type of the step:
  * `text`
  * `sequence`
  * `prompt`
  * `score`
  * `handler`
  * `end`
* `steps` - An array of steps or other scenarios
* `models` - see [#Models]

### Steps Types

#### type: "text"

Display a text which can also be formatted with dialog variables.

Properties:

```json
{
  "type": "text",
  "data": { "text": <required>"Text to print" }
}
```

#### type: "sequence"

This step is a wrapper of one or more subsidiary steps.

Properties:

```json
{
  "id": <required>"step id",
  "type": "sequence",
  "steps": <required>[ {...}, {...} ]
}
```

#### type: "prompt"

Prompt for a defined user response.

Properties:

```json
{
  "type": "prompt",
  "data": {
    "type": "text",
    "text": <required>"Text to print with the prompt options"
  }
}
```

Prompt types can be one of:

* `text` [default] - Prompts for free text. This options is set in case no `type` property is provided
* `number` - Request for a valid number
* `time` - Request for a time construct like "2 hours ago", "yesterday", etc.
* `confirm` - Yes \ No

#### type: "score"

Get a text from the user and resolve the intent against a single or multiple intent recognition (Luis) APIs.

Properties:

```json
{
  "id": <required>"intentId",
  "type": "score",
  "data": {
    "models": <required>[ "model1", "model2" ]
  },
  "scenarios": <required>[
    {
      "condition": "intentId.intent == 'intent_1'",
      "nodeId": "Node Id to jump to"
    },
    {
      "condition": "intentId.intent == 'intent_2'",
      "steps": [ { ... }, { ... } ]
    },
    {
      "condition": "intentId.intent == 'intent_3'",
      "steps": [ { "subScenario": "intent_3_scenario" } ]
    }
  ]
}
```

For models, see [#Models].
Under models, specify one or more models you have defined under `models` property.

Under scenarios, define a condition for expected intent and which scenario \ step it should jump to.

#### type: "handler"

Enables providing a custom code to handle a specific step.

Properties:

```json
{
  "type": "handler",
  "data": { "name": <required>"handler" }
}
```

`name` the name for this handler. This will be provided to the callback for loading this handler.

#### type: "end"

End the dialog and ignore any further steps.

Properties:

```json
{
  "type": "end",
  "data": { "text": "Optional text to display before ending the conversation." }
}
```

### Models

This property defined the models that can be used for intent recognition throughout the dialog.

```json
{
  "type": "sequence",
  "steps": [ ... ],
  "models": [
    {
      "name": "model1",
      "url": "https://model1.url&q="
    },
    {
      "name": "model2",
      "url": "https://model2.url&q="
    },
    {
      "name": "model3",
      "url": "https://model3.url&q="
    }
  ]
}
```

### Text Format
When prompting or displaying text, it is possible to use a format to insert session variables like that:

```json
{
  "id": "userName",
  "type": "prompt",
  "data": {
    "type": "text",
    "text": "what is your name?"
  }
},
{
  "type": "text",
  "data": { "text": "Welcome {userName}!" }
}
```

# License
[MIT](LICENSE)
