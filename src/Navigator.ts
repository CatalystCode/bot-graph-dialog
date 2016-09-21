

import builder = require('botbuilder');
import n = require('./Node');

var strformat = require('strformat');

var StepTypes = {
  interaction: 'interaction',
  collection: 'collection',
  setNext: 'setNext'
};

const SESSION_CURR_NODE_ID_KEY: string = '_currentNodeId';
const SESSION_CURR_STEP_TYPE_KEY: string = '_currentStepType';

const SESSION_CURRENT_STEP_TYPE: string = StepTypes.interaction;

export interface INavigator {
  getNext(session: builder.Session): builder.IGraphStep
}

export class Navigator implements INavigator {

  private nodes: {[id: string]: n.INode} = {};

  constructor(private root: n.INode) {
    if (!root) {
      throw new Error('root node was not provided');
    }
	}

  public addNode(node: n.INode) {
    this.nodes[node.id()] = node;
  }

  public getSteps(): builder.IGraphStep[] {
    let steps: builder.IGraphStep[] = [];
    for (let i=0; i< 100; i++) {
      // todo: check why we need the bind...
      steps.push(this.executeNextStep.bind(this));
    }
    return steps;
  }

  public getNext(session: builder.Session): builder.IGraphStep {
    return (session: builder.Session, result?: any | builder.IDialogResult<any>, skip?: (results?: builder.IDialogResult<any>) => void): any => {
      this.executeNextStep(session, result, skip);
    }
  }

  private executeNextStep(session: builder.Session, result?: any | builder.IDialogResult<any>, skip?: (results?: builder.IDialogResult<any>) => void): any {
    let currStepType = this.getCurrentStepType(session);
    console.log(`executeNextStep: ${currStepType}`);
    switch (currStepType) {
      case StepTypes.interaction:
        this.setNextStepType(session, StepTypes.collection);
        this.stepInteractionHandler(session, result, skip);
        break;
      case StepTypes.collection:
        this.setNextStepType(session, StepTypes.setNext);
        this.stepResultCollectionHandler(session, result, skip);
        break;
      case StepTypes.setNext:
        this.setNextStepType(session, StepTypes.interaction);
        this.setNextStepHandler(session, result, skip);
        break;
      default:
        throw new Error(`Invalid step type: ${currStepType}`);
    }
  }

  private getCurrentStepType(session: builder.Session): string {
    return session.dialogData[SESSION_CURR_STEP_TYPE_KEY] || StepTypes.interaction;
  }

  private setNextStepType(session: builder.Session, step: string) {
    return session.dialogData[SESSION_CURR_STEP_TYPE_KEY] = step;
  }
  private getCurrentNode(session: builder.Session): n.INode {
    console.log('getCurrentNode');
    let currNodeId = <string>session.dialogData[SESSION_CURR_NODE_ID_KEY];
    if (!currNodeId) {
      session.dialogData[SESSION_CURR_NODE_ID_KEY] = this.root.id();
      return this.root;
    }

    let current = this.nodes[currNodeId];
    return current;
  }

 // TODO: add option for 'bot is typeing' message before sending the answer
  private stepInteractionHandler(session: builder.Session, result?: any | builder.IDialogResult<any>, next?: (results?: builder.IDialogResult<any>) => void): any {
    // TODO: move _lastMessage key to consts
    session.dialogData._lastMessage = session.message && session.message.text;
    let currentNode = this.getCurrentNode(session);
    console.log(`perform action: ${currentNode.id()}, ${currentNode.type()}`);

    switch (currentNode.type()) {

      case n.NodeTypes.text:
        var text = strformat((<n.TextNode>currentNode).text(), session.dialogData);
        console.log(`sending text for node ${currentNode.id()}, text: \'${text}\'`);
        session.send(text);
        return next();

        
      case n.NodeTypes.prompt:
        console.log(`builder.ListStyle.button: ${builder.ListStyle["button"]}`); 
        var promptType = /*currentNode.data.type || */ 'text';
        builder.Prompts[promptType](
          session, 
          (<n.PromptNode>currentNode).text(), 
          {} /*currentNode.data.options */, 
          { 
            listStyle: /*currentNode.data.config && currentNode.data.config.listStyle && builder.ListStyle[currentNode.data.config.listStyle] || */
            builder.ListStyle.button 
          });
        break;
        /*
      case NodeType.score:
        var botModels = currentNode.data.models.map(model => this.nav.models.get(model));
        
        var text = session.dialogData[currentNode.data.source] || session.dialogData._lastMessage;
        console.log(`LUIS scoring for node: ${currentNode.id}, text: \'${text}\' LUIS models: ${botModels}`);

        this.intentScorer.collectIntents(botModels, text, currentNode.data.threashold)
          .then(intents => {
              if (intents && intents.length) {
                this.stepResultCollectionHandler(session, { response: intents[0] }, next);
              }
            },
            function (err) {
              throw error;
            }
          );
          
        break;

      case NodeType.handler:
        var handlerName = currentNode.data.name;
        var handlerPath = path.join(this.options.parser.handlersPath, handlerName)
        var handler = require(handlerPath);
        console.log('calling handler: ', currentNode.id, handlerName);
        return handler(session, next, currentNode.data);
    
      case NodeType.sequence:
        return next();

      case NodeType.end:
        console.log('ending dialog, node:', currentNode.id);
        session.send(currentNode.data.text || 'Bye bye!');
        session.endDialog();
        break;
*/
      default:
        var msg = 'Node type ' + currentNode.type() + ' is not recognized';
        console.error(msg);
        var error = new Error(msg);
        console.error(error);
        throw error; 
    }  
  }

  private stepResultCollectionHandler(session: builder.Session, results, next) {
    let currentNode = this.getCurrentNode(session);
    let varname = <string>currentNode.varname();
    
    if (!(results.response && varname)) 
			return next();

      
    switch (currentNode.type()) {

      case n.NodeTypes.prompt:

    /*
				// TODO switch to enum
        switch (currentNode.data.type) {
          case 'time':
            session.dialogData[varname] = builder.EntityRecognizer.resolveTime([results.response]);
            break;
          case 'choice':
            session.dialogData[varname] = results.response.entity;
            break;
          default:
            session.dialogData[varname] = results.response;
        }
        break;
        */
        
      default: 
        session.dialogData[varname] = results.response;
    }
   

    console.log('collecting response for node: %s, variable: %s, value: %s', currentNode.id(), varname, session.dialogData[varname]);   
    return next();
  }

  private setNextStepHandler(session: builder.Session, args, next): any {
    let nextNode = this.getNextNode(session);

    if (nextNode) {
      console.log(`step handler node: ${nextNode.id()}`);
    }
    else {
				console.log('ending dialog');
				session.endDialog();
				return;
			}

    return next();
  }

  public getNextNode(session: builder.Session) : n.INode {
    console.log('getNextNode');
    let next: n.INode = null;
    let current = this.nodes[session.dialogData[SESSION_CURR_NODE_ID_KEY]];

    /*
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
*/
    // if no next yet, travel the graph, look for next at parents...
    // If there is no selected scenario, move to the next node.
    // If there is no next node, look recursively for next on parent nodes.
    let nodeNavigator = current;
    while (!next && nodeNavigator) {
      next = nodeNavigator.next();
      //nodeNavigator = nodeNavigator.parent();
    }

    console.log(`getNextNode: [current: ${current.id()}, next: ${next && next.id()}]`);
    session.dialogData[SESSION_CURR_NODE_ID_KEY] = next && next.id();

    return next;
  }
}

/*
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

  public models = new Map<interfaces.ILuisModel>();

	constructor(private parser: Parser, private options: interfaces.INavigatorOptions = {}) {
    // TODO: remove models. point nodes to Model object instead of keeping a map for models.
    this.models = parser.models;
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
*/