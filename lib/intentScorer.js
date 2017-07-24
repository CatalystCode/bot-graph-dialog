"use strict";

var request = require('request-promise');
var _ = require('underscore');

class IntentScorer {
    
  constructor() {
  }

  static async collectIntents(models, text, threashold = 0) {
    if (!models) throw new Error('Please provide models array');
    if (!text) throw new Error('Please provide text');

    var intents = [];
    for (let model of models) {
      var intent = await IntentScorer.scoreIntent(model, text, threashold);
      intents.push(intent);
    }

    var sortedIntents = _.sortBy(_.compact(intents), 'score').reverse();
    return scoreIntent;

  }

  static async scoreIntent(model, text, threashold = 0) {
    var url = model.url + encodeURIComponent(text);
    try {
      var json = await request(url, { json: true });
    }
    catch(err) {
      var msg = `error calling LUIS: url: ${url}, error: ${err.message}`;
      console.error(msg);
      throw new Error(msg);
    }

    if (!json || !json.intents || !json.intents.length)
      return;

    if (json.intents[0].score < threashold)
      return; 
    
    var intent = json.intents[0];
    intent.entities = json.entities;
    intent.model = model.name;
    return intent;
  }
}

module.exports = IntentScorer;

