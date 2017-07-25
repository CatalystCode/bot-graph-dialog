"use strict";

var util = require('util');
var Node = require('./Node');
var Scenario = require('./Scenario');
var Luis = require('./Luis');
var Common = require('./Common');
var extend = require('extend');
var crypto = require('crypto');

// parses a json based scenario
class Parser {

  constructor (options) {
    this.options = options;
    this.uniqueNodeId = 1;
    this.root = null;
    this.version = null;
    this.nodes = new Common.Map();
    this.models = new Common.Map();
    this.handlers = new Common.Map();
  }

  // loads and parses a scenario
  async init() {
    try {
      var graph = await this.options.loadScenario(this.options.scenario);
      await this.normalizeGraph(graph);
    }
    catch(err) {
      console.error(`error loading scenario. options: ${util.inspect(this.options)}, error: ${util.inspect(err)}`);
      throw new Error(`Error loading scenario '${this.options.scenario}': ${err.message}`);
    }
  }

  // gets a node instance by its Id
  getNodeInstanceById(id) {
    var node = this.nodes[id];
    return node && node._instance;
  }

  // normalize the graph
  async normalizeGraph(origGraph) {

    try {

      // create a copy of the graph object
      var graph = {};
      extend(true, graph, origGraph);

      console.log('loading scenario:', graph.id);
      this.updateModels(graph.models);

      await this.recursive(graph);

      // first iteration- create Node instances
      var nodes = this.nodes;
      for (var nodeId in nodes) {
        var node = nodes[nodeId];
        var inst = new Node(node, node.type);
        node._instance = inst;
      }

      // second iteration- connect reference to Node instances
      for (var nodeId in nodes) {

        var node = nodes[nodeId];
        var inst = node._instance;
        if (node._parent) inst.parent = node._parent._instance;
        if (node._prev) inst.prev = node._prev._instance;
        if (node._next) inst.next = node._next._instance;

        for (let step of node.steps || []) {
          inst.steps.add(step._instance);
        }
          
        for (let scenario of node.scenarios || []) {
          var scene = new Scenario( scenario.condition, 
                                    scenario.nodeId ? this.nodes[scenario.nodeId]._instance : null);
          
          for (let step of scenario.steps || []) {
            scene.steps.add(step._instance);
          };

          inst.scenarios.add(scene);
        }
      }

      // third iteration- remove unneccessary data/references
      for (var nodeId in nodes) {
        var node = nodes[nodeId];
        var inst = node._instance;
        delete node._visited;
        delete node._parent;
        delete node._prev;
        delete node._next;
      }
        
      this.root = graph._instance;
      this.version = graph.version || this.calculateHash(JSON.stringify(origGraph));
    }
    catch(err) {
      console.error(`error normalizing graph: ${util.inspect(origGraph)}, error: ${util.inspect(err)}`);
      throw new Error(`Error normalizing graph '${util.inspect(origGraph)}': ${err.message}`);
    }
  }

  // initialize a node in the graph
  async initNode(parent, nodes, nodeItem, index) {
    try {

      if (nodeItem._visited) return;

      nodeItem._visited = true;
      nodeItem.id = nodeItem.id || `_node_${this.uniqueNodeId++}`;

      if (parent) nodeItem._parent = parent;
      if (index > 0) nodeItem._prev = nodes[index - 1];
      if (nodes.length > index + 1) nodeItem._next = nodes[index + 1];

      if (this.isSubScenario(nodeItem)) {
        console.log("sub-scenario for node: " + nodeItem.id + " [embedding sub scenario: " + nodeItem.subScenario + "]");
        var scenarioObj = await this.options.loadScenario(nodeItem.subScenario);
        extend(true, nodeItem, scenarioObj);
        this.updateModels(scenarioObj.models);
        console.log('node:', nodeItem.id, nodeItem._parent && nodeItem._parent.id ? '[parent: ' + nodeItem._parent.id + ']' : '', nodeItem._next && nodeItem._next.id ? '[next: ' + nodeItem._next.id + ']' : '', nodeItem._prev && nodeItem._prev.id ? '[prev: ' + nodeItem._prev.id + ']' : '');
        return this.recursive(nodeItem);               
      }

      if (nodeItem.type === 'handler') {
        var handler = nodeItem.data.name || '';
        console.log("loading handler for node: " + nodeItem.id + " [embedding sub scenario: " + handler + "]");
        
        var jsCode = null;
        if (nodeItem.data.js) {
          var content = nodeItem.data.js;

          if (Array.isArray(content))
            jsCode = content.join('\n');
        }
        else {
          try {
            jsCode = await this.options.loadHandler(handler);
          }
          catch(err) {
            console.error(`error loading handler: ${handler}: error: ${err.message}`);
          }
        }

        var func = this.getHandlerFunc(jsCode);
        if (!func) {
          console.error(`error loading handler ${handler}: js code: ${jsCode}`);
          throw new Error(`error loading handler ${handler}: js code: ${jsCode}`);
        }

        this.handlers.add(handler, func);
      }

      console.log('node:', nodeItem.id, nodeItem._parent && nodeItem._parent.id ? '[parent: ' + nodeItem._parent.id + ']' : '', nodeItem._next && nodeItem._next.id ? '[next: ' + nodeItem._next.id + ']' : '', nodeItem._prev && nodeItem._prev.id ? '[prev: ' + nodeItem._prev.id + ']' : '');
      await this.recursive(nodeItem);
      
    }
    catch(err) {
      console.error(`error initNode: ${util.inspect(arguments)}, error: ${util.inspect(err)}`);
      throw new Error(`Error initNode'${util.inspect(node)}': ${err.message}`);
    }
  }

  // initialize a collecton of nodes
  async initNodes(parent, nodes = []) {
    for (var i=0; i<nodes.length; i++)
      await this.initNode(parent, nodes, nodes[i], i);
  }

  // recursively init a node and its childrens
  async recursive(node) {
    node.id = node.id || `_node_${this.uniqueNodeId++}`;

    await this.initNodes(node, node.steps);
    
    // althogh this is slower than using the following command:
    // await Promise.all((node.scenarios || []).map(async scenario => await this.initNodes(node, scenario.steps)));
    // it keeps the order of the calls such that it waits for a call the end before invoking the next one.
    // this is what we want to do, since the order is important.
    for (let scenario of node.scenarios || []) {
      await this.initNodes(node, scenario.steps); 
    }
    
    this.nodes[node.id] = node;
  }

  // checks if this is a sub-scenario node
  isSubScenario(nodeItem) {
    if (!nodeItem.subScenario) return false;

    var parent = nodeItem._parent;
    while (parent) {
      if (nodeItem.subScenario === parent.id) {
        console.error(`recursive subScenario found: ${nodeItem.subScenario}`);
        throw new Error(`recursive subScenario found: ${nodeItem.subScenario}`);
      }
      parent = parent._parent;
    }

    return true;
  }

  // gets a handler function from a string
  getHandlerFunc(funcText) {
    var text = `(() => {
                  return module => {
                    ${funcText}
                  }
                })()`;
    var wrapperFunc = eval(text);
    var m = {};
    wrapperFunc(m);
    return typeof m.exports === 'function' ? m.exports : null;
  }

  // updates the internal LUIS models collection
  updateModels(models = []) {
    for (let model of models) {
      this.models.add(model.name, new Luis.LuisModel(model.name, model.url));
    }
  }

  // calculates hash of an input text
  calculateHash(text) {
    return crypto.createHash('md5').update(text).digest('hex');
  }

}

module.exports = Parser;
