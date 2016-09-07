import nodeAPI = require('./Node');
import scenarioAPI = require('./Scenario');
import graph = require('./GraphDialog');

import builder = require('botbuilder');

import path = require('path');

var extend = require('extend');
var strformat = require('strformat');

import common = require('./common');

let Node = nodeAPI.Node;
let List = common.List;


export interface INavigatorOptions {
	graph: any;
	scenariosPath?: string;
	handlersPath?: string;
} 

export class Navigator {

	private root: nodeAPI.INode;
  private uniqueNodeId: number = 1;
  private nodeIds: { [id: string] : any; } = {};

  //private nodes: { [id: string] : nodeAPI.INode; } = {};

	constructor(private options: INavigatorOptions) {
		this.root = this.normalizeGraph(options.graph);
	}

	public getSteps(): any[] {
    console.log('get steps');
    return [];
	}

  private normalizeGraph(origGraph: any): nodeAPI.INode {
    
    // create a copy of the graph object
    var graph: any = {};
    extend(true, graph, origGraph);

    console.log('loading scenario:', graph.id);

    this.recursive(graph);
    let nodeIds = this.nodeIds;

    // first iteration- create Node instances
    for (let nodeId in nodeIds) {
        let node = nodeIds[nodeId];
        let inst = new Node(node);
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
          let scene = new scenarioAPI.Scenario(scenario.condition);
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
      delete node._instance;
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
          //updateModels(subScenario.models);
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
    
}
