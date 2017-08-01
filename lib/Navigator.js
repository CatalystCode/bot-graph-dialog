"use strict";

var ConditionHandler = require('./ConditionHandler');

// helper class to navigate the dialog graph
class Navigator {

  constructor(parser, options = {}) {
    this.parser = parser;
    this.options = options;
    this.models = parser.models;
    this.handlers = parser.handlers;
  }

  // returns the current node of the dialog
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

  // resolves the next node in the dialog
  getNextNode(session) {
    console.log('getNextNode');

    var next = null;
    var current = this.parser.getNodeInstanceById(session.privateConversationData._currentNodeId);
    
    // if there are child scenarios, see if one of them answers a condition.
    // in case it is, choose the first step in that scenario to as the next step.
    var scenarios = current.scenarios;
    for (var i = 0; i < current.scenarios.size(); i++) {
      var scenario = current.scenarios.get(i);
      if (ConditionHandler.evaluateExpression(session.dialogData.data, scenario.condition)) {
        next = scenario.node || scenario.steps.get(0);
      }
    }

    // if no next yet, get the first step
    next = next || current.steps.get(0);

    // if no next yet, travel the graph, look for next at parents...
    // if there is no selected scenario, move to the next node.
    // if there is no next node, look recursively for next on parent nodes.
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
