"use strict";

var Common = require('./Common');

// a scenario class
class Scenario {
  
  constructor(condition, node) {

    if (!condition) throw new Error(`param 'condition' was not provided`);
    // node is optional, no need to validate

    this.condition = condition;
    this.node = node;
    this.steps = new Common.List();
  }

}

module.exports = Scenario;
