import nodeAPI = require('./Node');
import graph = require('./GraphDialog');

import builder = require('botbuilder');

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
  //private nodes: { [id: string] : nodeAPI.INode; } = {};

	constructor(private options: INavigatorOptions) {
		this.normalizeGraph(options.graph);
	}

	public getSteps(): any[] {
			console.log('get steps');
			return [];
	}

	 private normalizeGraph(origGraph: any) {
      var graph: any = {};
      extend(true, graph, origGraph);

      var uniqueNodeId = 1;

      let nodeIds: { [id: string] : any; } = {};
      console.log('processing scenario:', graph.id);

      recursive(graph);

      // first iteration- create Node instances
      for (let nodeId in nodeIds) {
          let node = nodeIds[nodeId];
          let inst = new Node(node);
          node._instance = inst;
      }

      // second iteration- connect reference to Node instances
      for (let nodeId in nodeIds) {
          let node = nodeIds[nodeId];
          let inst = node._instance;
          if (node._parent) inst.parent = node._parent._instance;
          if (node._prev) inst.prev = node._prev._instance;
          if (node._next) inst.next = node._next._instance;
      }

      this.root = <nodeAPI.INode>graph._instance;

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

      function initNodes(parent: any, nodes: any[]) {
        nodes = nodes || [];
        nodes.forEach(function(nodeItem, index) {
            if (nodeItem._visited) return;
            nodeItem._visited = true;
            if (!nodeItem.id) { nodeItem.id = '_node_' + (uniqueNodeId++); } 

            if (parent) nodeItem._parent = parent;
            if (index > 0) nodeItem._prev = nodes[index - 1];
            if (nodes.length > index + 1) nodeItem._next = nodes[index + 1];

            /*
            // In case of subScenario, copy all subScenario to current node
            if (isSubScenario(nodeItem)) {
                console.log('sub-scenario for node:', nodeItem.id, '[loading sub scenario: ', nodeItem.subScenario + ']');
                var subScenarioPath = path.join(self.scenariosPath, nodeItem.subScenario + '.json');
                var subScenario = require(subScenarioPath);
                extend(true, nodeItem, subScenario);
                updateModels(subScenario.models);
            }
            */
            console.log('node:', nodeItem.id, 
              nodeItem._parent && nodeItem._parent.id ? '[parent: ' + nodeItem._parent.id + ']' : '', 
              nodeItem._next && nodeItem._next.id ? '[next: ' + nodeItem._next.id  + ']' : '', 
              nodeItem._prev && nodeItem._prev.id ? '[prev: ' + nodeItem._prev.id  + ']' : '');
            
            recursive(nodeItem);
        }, this); 
      }

      function recursive(node: any) {
        if (!node.id) { node.id = '_node_' + (uniqueNodeId++); } 
        initNodes(node, node.steps);

        var scenarios = node.scenarios || [];
        scenarios.forEach(function(scenario: any) {
          initNodes(node, scenario.steps);
        }, this);
        
        if (node.type === 'sequence') {
          initNodes(node, node.steps);
        }

        nodeIds[node.id] = node;
      }

      function isSubScenario(nodeItem: any) {
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
}
