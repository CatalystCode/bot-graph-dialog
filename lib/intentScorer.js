"use strict";

var request = require('request-promise');
var _ = require('underscore');

// score intents from a single or multiple intent scoring APIs
class IntentScorer {
    
  constructor() {
  }

  // collect response from all models
  static async collectIntents(models, text, threashold = 0) {
    if (!models) throw new Error('Please provide models array');
    if (!text) throw new Error('Please provide text');

    var intents = await Promise.all(models.map(async model => await IntentScorer.scoreIntent(model, text, threashold)));
    var sortedIntents = _.sortBy(_.compact(intents), 'score').reverse();
    return sortedIntents;
  }

  // scores a specific intent, invoke actual request to LUIS
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

