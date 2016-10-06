import { Node } from './Node';
import { Scenario } from './Scenario';
import { ConditionHandler } from './ConditionHandler';
import { LuisModel } from './Luis';
import { Map, List } from './Common';
import { Parser } from './Parser';
import builder = require('botbuilder');
import path = require('path');
import interfaces = require('./Interfaces');

var extend = require('extend');
var strformat = require('strformat');

let NodeType = interfaces.NodeType;

// TODO implement using interface H&E
export class Navigator {

  public models: Map<interfaces.ILuisModel>;
  public handlers: Map<any>;


	constructor(private parser: Parser, private options: interfaces.INavigatorOptions = {}) {
    // TODO: remove models. point nodes to Model object instead of keeping a map for models.
    this.models = parser.models;
    this.handlers = parser.handlers;
	}

  public getCurrentNode(session: builder.Session): interfaces.INode {
    console.log('getCurrentNode');
    let currNodeId = <string>session.dialogData._currentNodeId;
    if (!currNodeId) {
      let root = this.parser.root;
      session.dialogData._currentNodeId = root && root.id;
      return root;
    }

    let current = this.parser.getNodeInstanceById(currNodeId);
    return current;
  }


  public getNextNode(session: builder.Session) : interfaces.INode {
    console.log('getNextNode');
    let next : interfaces.INode = null;
    let current = this.parser.getNodeInstanceById(session.dialogData._currentNodeId);

    // If there are child scenarios, see if one of them answers a condition
    // In case it is, choose the first step in that scenario to as the next step
    let scenarios: List<interfaces.IScenario> = current.scenarios;
    for (var i=0; i<current.scenarios.size(); i++) {
      var scenario = current.scenarios.get(i);

      // TODO move evaluateExpression into Scenario class
      if (ConditionHandler.evaluateExpression(session.dialogData, scenario.condition)) {
        next = scenario.node || scenario.steps.get(0);
      }
    }

    // if no next yet, get the first step
    next = next || current.steps.get(0);

    // if no next yet, travel the graph, look for next at parents...
    // If there is no selected scenario, move to the next node.
    // If there is no next node, look recursively for next on parent nodes.
    var nodeNavigator = current;
    while (!next && nodeNavigator) {
      next = nodeNavigator.next;
      nodeNavigator = nodeNavigator.parent;
    }

    console.log(`getNextNode: [current: ${current.id}, next: ${next && next.id}]`);
    session.dialogData._currentNodeId = next && next.id;

    return next;
  }

}
