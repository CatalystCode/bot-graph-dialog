"use strict";

// wrapper class for a LuisModel details
exports.LuisModel = class {
  constructor(name, url) {
    if (!name) throw new Error(`param 'name' was not provided`);
    if (!url) throw new Error(`param 'url' was not provided`);

    this.name = name;
    this.url = url;
  }
}

// wrapper class for an intent score
exports.IntentScore = class {
  constructor(name, model, score) {
    if (!name) throw new Error(`param 'name' was not provided`);
    if (!model) throw new Error(`param 'model' was not provided`);
    if (!score) throw new Error(`param 'score' was not provided`);

    this.name = name;
    this.model = model;
    this.score = score;
  }
}

