import { NodeType, INode } from './Node';
import { IScenario, Scenario } from './Scenario';
import { ConditionHandler } from './ConditionHandler';
import { ILuisModel } from './Luis';
import { Map, List } from './Common';
import { Parser, IParserOptions } from './Parser';
import * as builder from 'botbuilder';
import * as path from 'path';
import * as extend from 'extend';
import * as strformat from 'strformat';

export interface INavigatorOptions extends IParserOptions {
	
} 

export class Navigator {

  public models: Map<ILuisModel>;
  public handlers: Map<any>;

	constructor(private parser: Parser, private options: INavigatorOptions = {}) {
    this.models = parser.models;
    this.handlers = parser.handlers;
	}

  // Returns the current node of the dialog
  public getCurrentNode(session: builder.Session): INode {
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

  // Retreives the next node in the dialog
  public getNextNode(session: builder.Session) : INode {
    console.log('getNextNode');
    let next : INode = null;
    let current = this.parser.getNodeInstanceById(session.dialogData._currentNodeId);

    // If there are child scenarios, see if one of them answers a condition
    // In case it is, choose the first step in that scenario to as the next step
    let scenarios: List<IScenario> = current.scenarios;
    for (var i=0; i<current.scenarios.size(); i++) {
      var scenario = current.scenarios.get(i);

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
