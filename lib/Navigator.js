"use strict";

var ConditionHandler = require('./ConditionHandler');

class Navigator {

  constructor(parser, options = {}) {
    this.parser = parser;
    this.options = options;
    this.models = parser.models;
    this.handlers = parser.handlers;
  }

  getCurrentNode(session) {
    console.log('getCurrentNode');
    var currNodeId = session.privateConversationData._currentNodeId;
    if (!currNodeId || !this.parser.getNodeInstanceById(currNodeId)) {
      var root = this.parser.root;
      session.privateConversationData._currentNodeId = root && root.id;
      return root;
    }
    var current = this.parser.getNodeInstanceById(currNodeId);
    return current;
  };

  getNextNode(session) {
    console.log('getNextNode');

    var next = null;
    var current = this.parser.getNodeInstanceById(session.privateConversationData._currentNodeId);
    var scenarios = current.scenarios;

    for (var i = 0; i < current.scenarios.size(); i++) {
      var scenario = current.scenarios.get(i);
      if (ConditionHandler.evaluateExpression(session.dialogData.data, scenario.condition)) {
          next = scenario.node || scenario.steps.get(0);
      }
    }

    next = next || current.steps.get(0);
    var nodeNavigator = current;
    while (!next && nodeNavigator) {
      next = nodeNavigator.next;
      nodeNavigator = nodeNavigator.parent;
    }

    console.log("getNextNode: [current: " + current.id + ", next: " + (next && next.id) + "]");
    session.privateConversationData._currentNodeId = next && next.id;
    return next;
  };
}

module.exports = Navigator;
