"use strict";

var util = require('util');
var Node = require('./Node');
var Scenario = require('./Scenario');
var Luis = require('./Luis');
var Common = require('./Common');
var extend = require('extend');
var crypto = require('crypto');

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

  getNodeInstanceById(id) {
    var node = this.nodes[id];
    return node && node._instance;
  }

  async normalizeGraph(origGraph) {

    try {
      var graph = {};
      extend(true, graph, origGraph);
      console.log('loading scenario:', graph.id);
      this.updateModels(graph.models);

      await this.recursive(graph);
          
      var nodes = this.nodes;
      for (var nodeId in nodes) {
        var node = nodes[nodeId];
        var inst = new Node(node, node.type);
        node._instance = inst;
      }

      for (var nodeId in nodes) {

        var node = nodes[nodeId];
        var inst = node._instance;
        if (node._parent)
            inst.parent = node._parent._instance;
        if (node._prev)
            inst.prev = node._prev._instance;
        if (node._next)
            inst.next = node._next._instance;

        for (let step of node.steps || []) {
          inst.steps.add(step._instance);
        }
          
        for (let scenario of node.scenarios || []) {

          var scenarioNode = null;
          if (scenario.nodeId) {
            scenarioNode = this.nodes[scenario.nodeId]._instance;
          }

          var scene = new Scenario(scenario.condition, scenarioNode);
          
          for (let step of scenario.steps || []) {
            scene.steps.add(step._instance);
          };

          inst.scenarios.add(scene);
        }
      }

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

  async initNodes(parent, nodes = []) {
    for (var i=0; i<nodes.length; i++)
      await this.initNode(parent, nodes, nodes[i], i);
  }

  async recursive(node) {

    node.id = node.id || `_node_${this.uniqueNodeId++}`;
    
    await this.initNodes(node, node.steps);
    
    for (var i=0; i<(node.scenarios || []).length; i++) {
      var scenario = node.scenarios[i];
      await this.initNodes(node, scenario.steps); 
    }

    /*
    // TODO: check if this is neccessary
    if (node.type === 'sequence') {
      await this.initNodes(node, node.steps);
    }
    */

    this.nodes[node.id] = node;
  }

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

  getHandlerFunc(funcText) {
    var text = "(function(){\nreturn function(module) { \n                    " + funcText + "\n                  }\n                  })()\n                ";
    var wrapperFunc = eval(text);
    var m = {};
    wrapperFunc(m);
    return typeof m.exports === 'function' ? m.exports : null;
  }

  updateModels(models = []) {
    for (let model of models) {
      this.models.add(model.name, new Luis.LuisModel(model.name, model.url));
    }
  }

  calculateHash(text) {
    return crypto.createHash('md5').update(text).digest('hex');
  }

}

module.exports = Parser;
