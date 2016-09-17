import nodeAPI = require('./Node');
import scenarioAPI = require('./Scenario');
import graph = require('./GraphDialog');
import ConditionHandler = require('./ConditionHandler');
import Luis = require('./LuisModel');

import builder = require('botbuilder');

import path = require('path');

var extend = require('extend');
var strformat = require('strformat');

import common = require('./common');

let Node = nodeAPI.Node;
let NodeType = nodeAPI.NodeType;
let List = common.List;
let conditionHandler = ConditionHandler.ConditionHandler;

export interface INavigatorOptions {
	graph: any;
	scenariosPath?: string;
	handlersPath?: string;
} 

export class Navigator {

	private root: nodeAPI.INode;
  private uniqueNodeId: number = 1;
  private nodeIds: { [id: string] : any } = {};
  
  public models: { [id: string] : Luis.ILuisModel } = {};

  //private nodes: { [id: string] : nodeAPI.INode; } = {};

	constructor(private options: INavigatorOptions) {
		this.root = this.normalizeGraph(options.graph);
	}

  public getCurrentNode(session: builder.Session): nodeAPI.INode {
    console.log('getCurrentNode');
    let currNodeId = <string>session.dialogData._currentNodeId;
    if (!currNodeId) {
      session.dialogData._currentNodeId = this.root.id;
      return this.root;
    }

    let current : nodeAPI.INode = this.nodeIds[currNodeId]._instance;
    return current;
  }


  public getNextNode(session: builder.Session) : nodeAPI.INode {
    console.log('getNextNode');
    let next : nodeAPI.INode = null;
    let current : nodeAPI.INode = this.nodeIds[session.dialogData._currentNodeId]._instance;

    // If there are child scenarios, see if one of them answers a condition
    // In case it is, choose the first step in that scenario to as the next step
    let scenarios: common.List<scenarioAPI.IScenario> = current.scenarios;
    for (var i=0; i<current.scenarios.size(); i++) {
      var scenario = current.scenarios.get(i);

      // TODO move evaluateExpression into Scenario class
      if (conditionHandler.evaluateExpression(session.dialogData, scenario.condition)) {
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
    session.dialogData._currentNodeId = next.id;

    return next;
  }

 
  private normalizeGraph(origGraph: any): nodeAPI.INode {
    
    // create a copy of the graph object
    var graph: any = {};
    extend(true, graph, origGraph);

    console.log('loading scenario:', graph.id);
    this.updateModels(graph.models);
    
    this.recursive(graph);
    let nodeIds = this.nodeIds;

    // first iteration- create Node instances
    for (let nodeId in nodeIds) {
        let node = nodeIds[nodeId];
        let inst = new Node(node, node.type);
        node._instance = inst;
    }

    // second iteration- connect reference to Node instances
    for (let nodeId in nodeIds) {
        let node = nodeIds[nodeId];
        let inst = <nodeAPI.INode>node._instance;
        if (node._parent) inst.parent = node._parent._instance;
        if (node._prev) inst.prev = node._prev._instance;
        if (node._next) inst.next = node._next._instance;
        (node.steps || []).forEach((step: any) => {
          inst.steps.add(<nodeAPI.INode>step._instance);
        });
        (node.scenarios || []).forEach((scenario: any) => {
          let scenarioNode: nodeAPI.INode = null;
          if (scenario.nodeId) {
            scenarioNode = this.nodeIds[scenario.nodeId]._instance;
          }
          let scene = new scenarioAPI.Scenario(<string>scenario.condition, scenarioNode);
          (scenario.steps || []).forEach((step: any) => {
            scene.steps.add(<nodeAPI.INode>step._instance);
          });
          inst.scenarios.add(scene);
        });
    }

    // third iteration- remove un-neccessary data/references
    for (let nodeId in nodeIds) {
      let node = nodeIds[nodeId];
      let inst = node._instance;
      //delete node._instance;
      delete node._visited;
      delete node._parent;
      delete node._prev;
      delete node._next;
    }

    return <nodeAPI.INode>graph._instance;
  }

  private initNodes(parent: any, nodes: any[]) : void {
    (nodes || []).forEach((nodeItem, index) => {
      if (nodeItem._visited) return;
      nodeItem._visited = true;
      if (!nodeItem.id) { nodeItem.id = '_node_' + (this.uniqueNodeId++); } 

      if (parent) nodeItem._parent = parent;
      if (index > 0) nodeItem._prev = nodes[index - 1];
      if (nodes.length > index + 1) nodeItem._next = nodes[index + 1];

      // In case of subScenario, copy all subScenario to current node
      if (this.isSubScenario(nodeItem)) {
          console.log(`sub-scenario for node: ${nodeItem.id} [loading sub scenario: ${nodeItem.subScenario}]`);
          var subScenarioPath = path.join(this.options.scenariosPath, nodeItem.subScenario + '.json');
          var subScenario = require(subScenarioPath);
          extend(true, nodeItem, subScenario);
          this.updateModels(subScenario.models);
      }
      
      console.log('node:', nodeItem.id, 
        nodeItem._parent && nodeItem._parent.id ? '[parent: ' + nodeItem._parent.id + ']' : '', 
        nodeItem._next && nodeItem._next.id ? '[next: ' + nodeItem._next.id  + ']' : '', 
        nodeItem._prev && nodeItem._prev.id ? '[prev: ' + nodeItem._prev.id  + ']' : '');
      
      this.recursive(nodeItem);
    }); 
  }

  private recursive(node: any) : void {
    if (!node.id) { node.id = '_node_' + (this.uniqueNodeId++); } 
    
    this.initNodes(node, node.steps);

    (node.scenarios || []).forEach((scenario : any) => {
      this.initNodes(node, scenario.steps);
    });
    
    if (node.type === 'sequence') {
      this.initNodes(node, node.steps);
    }

    this.nodeIds[node.id] = node;
  }

  private isSubScenario(nodeItem: any) : boolean {
    if (!nodeItem.subScenario) return false;

    var parent = nodeItem._parent;
    while (parent) {
      if (nodeItem.subScenario === parent.id) { 
          console.error('recursive subScenario found: ', nodeItem.subScenario);
          throw new Error('recursive subScenario found ' + nodeItem.subScenario);
      }
      parent = parent._parent;
    }

    return true;
  }

  // TODO: move this to a new class Parser
  // that will create the navigator and models
	private updateModels(models: any[]): void {
      (models || []).forEach(model => { 
				this.models[model.name] = new Luis.LuisModel(model.name, model.url); 
			});
	}

}
