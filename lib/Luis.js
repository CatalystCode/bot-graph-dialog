"use strict";

exports.LuisModel = class {
  constructor(name, url) {
    this.name = name;
    this.url = url;
  }
}

exports.IntentScore = class {
  constructor(name, model, score) {
    this.name = name;
    this.model = model;
    this.score = score;
  }
}

