import { Node } from './Node';
import { Scenario } from './Scenario';
import { ConditionHandler } from './ConditionHandler';
import { LuisModel } from './Luis';
import { Map, List } from './Common';
import { Utils as utils } from './Utils';
import builder = require('botbuilder');
import path = require('path');
import interfaces = require('./Interfaces');


var extend = require('extend');
var strformat = require('strformat');
let NodeType = interfaces.NodeType;

// TODO add interface H&E
export class Parser {

  private uniqueNodeId: number = 1;

  public root: interfaces.INode = null;
  private nodes = new Map<any>();
  public models = new Map<interfaces.ILuisModel>();
  private subScenarios = new Map<any>();
  private done: () => any;

	constructor(private options: interfaces.IParserOptions) {
   
	}

  public init(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.loadJson(this.options.scenario)
        .then((graph) => {
          this.normalizeGraph(graph).then(() => {
            return resolve();
          }).catch(e => reject(e));
        })
        .catch(e => {
          console.error(`error loading scenario: ${this.options}: ${e.message}`);
          return reject(e);
      });
    });
  }

  public getNodeInstanceById(id: string) : interfaces.INode {
    //let node = this.nodes.get(id);
    let node = this.nodes[id]; // TODO: check why above line doesn't work
    return <interfaces.INode>(node && node._instance);
  }

	private loadJson(scenario: string): Promise<any> {
    if (typeof this.options.loadJson === 'function') {
      return this.options.loadJson(scenario);
    }

    return new Promise((resolve, reject) => {
      if (typeof scenario === 'string' && typeof this.options.scenariosPath === 'string') {
        let scenarioPath = path.join(this.options.scenariosPath, scenario);
        var json = utils.loadJson(scenarioPath);
        return resolve(json);
      }
    });
	}

  private normalizeGraph(origGraph: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // create a copy of the graph object
      var graph: any = {};
      extend(true, graph, origGraph);

      console.log('loading scenario:', graph.id);
      this.updateModels(graph.models);
      
      this.recursive(graph).then(() => {

        let nodes = this.nodes;

        // first iteration- create Node instances
        for (let nodeId in nodes) {
          let node = nodes[nodeId];
          let inst = new Node(node, node.type);
          node._instance = inst;
        }

        // second iteration- connect reference to Node instances
        for (let nodeId in nodes) {
          let node = nodes[nodeId];
          let inst = <interfaces.INode>node._instance;
          if (node._parent) inst.parent = node._parent._instance;
          if (node._prev) inst.prev = node._prev._instance;
          if (node._next) inst.next = node._next._instance;
          (node.steps || []).forEach((step: any) => {
            inst.steps.add(<interfaces.INode>step._instance);
          });
          (node.scenarios || []).forEach((scenario: any) => {
            let scenarioNode: interfaces.INode = null;
            if (scenario.nodeId) {
              scenarioNode = this.nodes[scenario.nodeId]._instance;
            }
            let scene = new Scenario(<string>scenario.condition, scenarioNode);
            (scenario.steps || []).forEach((step: any) => {
              scene.steps.add(<interfaces.INode>step._instance);
            });
            inst.scenarios.add(scene);
          });
        }

        // third iteration- remove un-neccessary data/references
        for (let nodeId in nodes) {
          let node = nodes[nodeId];
          let inst = node._instance;
          
          delete node._visited;
          delete node._parent;
          delete node._prev;
          delete node._next;
        }

        this.root = <interfaces.INode>graph._instance;
        return resolve();
      }).catch(e => reject(e));
    });
  }

  private loadSubScenarios(): Promise<any> {
    console.log(`loading sub scenarios: ${this.subScenarios.keys()}`);
    var promises = this.subScenarios.keys().map(subScenario => {
      return new Promise((resolve, reject) => {
        this.options.loadJson(subScenario)
        .then(scenarioObj => {
          this.subScenarios.add(subScenario, scenarioObj);
          resolve();
        })
        .catch(e => reject(e));
      });
    });

    return Promise.all(promises);
  }

  private initNode(parent: any, nodes: any[], nodeItem: any, index: number): Promise<any> {
    
      if (nodeItem._visited) 
        return Promise.resolve();
      nodeItem._visited = true;
        
      if (!nodeItem.id) { nodeItem.id = '_node_' + (this.uniqueNodeId++); } 

      if (parent) nodeItem._parent = parent;
      if (index > 0) nodeItem._prev = nodes[index - 1];
      if (nodes.length > index + 1) nodeItem._next = nodes[index + 1];

      if (this.isSubScenario(nodeItem)) {
        console.log(`sub-scenario for node: ${nodeItem.id} [embedding sub scenario: ${nodeItem.subScenario}]`);

        return new Promise((resolve, reject) => {
          this.options.loadJson(nodeItem.subScenario)
          .then(scenarioObj => {
            extend(true, nodeItem, scenarioObj);
            this.updateModels(scenarioObj.models);

            console.log('node:', nodeItem.id, 
              nodeItem._parent && nodeItem._parent.id ? '[parent: ' + nodeItem._parent.id + ']' : '', 
              nodeItem._next && nodeItem._next.id ? '[next: ' + nodeItem._next.id  + ']' : '', 
              nodeItem._prev && nodeItem._prev.id ? '[prev: ' + nodeItem._prev.id  + ']' : '');

            this.recursive(nodeItem).then(() => {
              return resolve();
            }).catch(e => reject(e));
          }).catch(e => reject(e));
        });
      }

      console.log('node:', nodeItem.id, 
          nodeItem._parent && nodeItem._parent.id ? '[parent: ' + nodeItem._parent.id + ']' : '', 
          nodeItem._next && nodeItem._next.id ? '[next: ' + nodeItem._next.id  + ']' : '', 
          nodeItem._prev && nodeItem._prev.id ? '[prev: ' + nodeItem._prev.id  + ']' : '');
      
      return this.recursive(nodeItem);

  }

  private initNodes(parent: any, nodes: any[]) : Promise<any> {
      return Promise.all((nodes || []).map((item, index) => this.initNode(parent, nodes, item, index)));
  }


  private recursive(node: any) : Promise<any> {

    return new Promise((resolve, reject) => {
      if (!node.id) { node.id = '_node_' + (this.uniqueNodeId++); } 

      this.initNodes(node, node.steps).then(() => {

        var promises = (node.scenarios || []).map(scenario => this.initNodes(node, scenario.steps));
        Promise.all(promises).then(() => {

          if (node.type === 'sequence') {
            this.initNodes(node, node.steps).then(()=> {
              this.nodes[node.id] = node; 
              return resolve();
            }).catch(e => reject(e));
            
          }
          else {
            this.nodes[node.id] = node; 
            return resolve();
          }
        }).catch(e => reject(e));
      }).catch(e => reject(e));
    });
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

	private updateModels(models: any[]): void {
      (models || []).forEach(model => { 
				this.models.add(model.name, new LuisModel(model.name, model.url));
			});
	}
}
