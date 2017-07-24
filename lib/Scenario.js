"use strict";

var Common = require('./Common');

class Scenario {
  
  constructor(condition, node) {
    this.condition = condition;
    this.node = node;
    this.steps = new Common.List();
  }

}

module.exports = Scenario;
