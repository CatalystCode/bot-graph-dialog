# bot-graph-dialog
Graph Bot Dialog


## Getting Started

```js
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

## Schema Break Down

Each step\scenario in the schema is recursive.

* `id` - The id for the step
* `type` [required] - The type of the step.
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

Get a text from the user and resolve the intent again a single or multiple intent recognition APIs.
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

This enables to enter a plug in with custom code
Properties:

```json
{
  "type": "handler",
  "data": { "name": <required>"handler" }
}
```

`name` is the file representing the handler file name.
In this case, a search will look for a file names `handler.js`.

#### type: "end"

End the dialog and ignore any further steps
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

## Sample Scenarios

[Here](examples)
