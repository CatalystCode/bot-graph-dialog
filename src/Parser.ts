import { NodeType, INode, Node } from './Node';
import { Scenario } from './Scenario';
import { ConditionHandler } from './ConditionHandler';
import { ILuisModel, LuisModel } from './Luis';
import { Map, List } from './Common';
import * as builder from 'botbuilder';
import * as path from 'path';
import * as extend from 'extend';
import * as strformat from 'strformat';
import * as Promise from 'bluebird';

// This externally implementable interface is used to define a custom handler
export interface IParserOptions {
	scenario?: string;
	loadScenario?(name: string): Promise<any>;
	loadHandler?(name: string): Promise<string>;
}

// Parse a json based scenario into a tree of nodes
export class Parser {

  private uniqueNodeId: number = 1;

  public root: INode = null;
  private nodes = new Map<INode>();
  public models = new Map<ILuisModel>();
  public handlers = new Map<any>();
  private done: () => any;

	constructor(private options: IParserOptions) {
   
	}

  public init(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.options.loadScenario(this.options.scenario)
        .then((graph) => {
          return this.normalizeGraph(graph).then(() => {
            return resolve();
          }).catch(e => reject(e));
        })
        .catch(e => {
          console.error(`error loading scenario: ${this.options}: ${e.message}`);
          return reject(e);
      });
    });
  }

  public getNodeInstanceById(id: string) : INode {
    //let node = this.nodes.get(id);
    let node = this.nodes[id]; // TODO: check why above line doesn't work
    return <INode>(node && node._instance);
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
          let inst = <INode>node._instance;
          if (node._parent) inst.parent = node._parent._instance;
          if (node._prev) inst.prev = node._prev._instance;
          if (node._next) inst.next = node._next._instance;
          (node.steps || []).forEach((step: any) => {
            inst.steps.add(<INode>step._instance);
          });
          (node.scenarios || []).forEach((scenario: any) => {
            let scenarioNode: INode = null;
            if (scenario.nodeId) {
              scenarioNode = this.nodes[scenario.nodeId]._instance;
            }
            let scene = new Scenario(<string>scenario.condition, scenarioNode);
            (scenario.steps || []).forEach((step: any) => {
              scene.steps.add(<INode>step._instance);
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

        this.root = <INode>graph._instance;
        return resolve();
      }).catch(e => reject(e));
    });
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
          this.options.loadScenario(nodeItem.subScenario)
          .then(scenarioObj => {
            extend(true, nodeItem, scenarioObj);
            this.updateModels(scenarioObj.models);

            console.log('node:', nodeItem.id, 
              nodeItem._parent && nodeItem._parent.id ? '[parent: ' + nodeItem._parent.id + ']' : '', 
              nodeItem._next && nodeItem._next.id ? '[next: ' + nodeItem._next.id  + ']' : '', 
              nodeItem._prev && nodeItem._prev.id ? '[prev: ' + nodeItem._prev.id  + ']' : '');

            return this.recursive(nodeItem).then(() => {
              return resolve();
            }).catch(e => reject(e));
          }).catch(e => reject(e));
        });
      }
      else if (nodeItem.type === 'handler') {
        var handler = nodeItem.data.name || '';
        console.log(`loading handler for node: ${nodeItem.id} [embedding sub scenario: ${handler}]`);

        if (nodeItem.data.js) {
          // handler code is embeded in the json in a multiline format (array) or a string
          var content = nodeItem.data.js;
          if (Array.isArray(content))
            content = content.join('\n');
          var func = this.getHandlerFunc(content);
          if (!func) {
            console.error(`error loading handler ${handler}`);
          }
          this.handlers.add(handler, func);
        }
        else {
          // handler code should be fethced using the loadHandler callback
          return new Promise((resolve, reject) => {
            this.options.loadHandler(handler)
            .then(text => {
              var func = this.getHandlerFunc(text);
              if (!func) {
                console.error(`error loading handler ${handler}`);
                return reject(new Error(`error loading handler ${handler}`));
              }
              this.handlers.add(handler, func);

              console.log('node:', nodeItem.id, 
                nodeItem._parent && nodeItem._parent.id ? '[parent: ' + nodeItem._parent.id + ']' : '', 
                nodeItem._next && nodeItem._next.id ? '[next: ' + nodeItem._next.id  + ']' : '', 
                nodeItem._prev && nodeItem._prev.id ? '[prev: ' + nodeItem._prev.id  + ']' : '');

              return this.recursive(nodeItem).then(() => {
                return resolve();
              }).catch(e => reject(e));
            }).catch(e => reject(e));
          });
        }
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
        return Promise.all(promises).then(() => {

          if (node.type === 'sequence') {
            return this.initNodes(node, node.steps).then(()=> {
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

  private getHandlerFunc(funcText: string): any {
    let text = `(function(){
                  return function(module) { 
                    ${funcText}
                  }
                  })()
                `;      

    var wrapperFunc = eval(text);
    var m: any = {};
    wrapperFunc(m);

    return typeof m.exports === 'function' ? m.exports : null;
  }

	private updateModels(models: any[]): void {
      (models || []).forEach(model => { 
				this.models.add(model.name, new LuisModel(model.name, model.url));
			});
	}
}
