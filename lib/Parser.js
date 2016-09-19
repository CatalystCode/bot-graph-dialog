"use strict";
var Node_1 = require('./Node');
var Scenario_1 = require('./Scenario');
var Luis_1 = require('./Luis');
var Common_1 = require('./Common');
var path = require('path');
var interfaces = require('./Interfaces');
var extend = require('extend');
var strformat = require('strformat');
var NodeType = interfaces.NodeType;
var Parser = (function () {
    function Parser(options) {
        this.options = options;
        this.uniqueNodeId = 1;
        this.nodes = new Common_1.Map();
        this.models = new Common_1.Map();
        this.root = options.graph ? this.normalizeGraph(options.graph) : null;
    }
    Parser.prototype.getNodeInstanceById = function (id) {
        var node = this.nodes[id];
        return (node && node._instance);
    };
    Parser.prototype.normalizeGraph = function (origGraph) {
        var _this = this;
        var graph = {};
        extend(true, graph, origGraph);
        console.log('loading scenario:', graph.id);
        this.updateModels(graph.models);
        this.recursive(graph);
        var nodes = this.nodes;
        for (var nodeId in nodes) {
            var node = nodes[nodeId];
            var inst = new Node_1.Node(node, node.type);
            node._instance = inst;
        }
        var _loop_1 = function(nodeId) {
            var node = nodes[nodeId];
            var inst = node._instance;
            if (node._parent)
                inst.parent = node._parent._instance;
            if (node._prev)
                inst.prev = node._prev._instance;
            if (node._next)
                inst.next = node._next._instance;
            (node.steps || []).forEach(function (step) {
                inst.steps.add(step._instance);
            });
            (node.scenarios || []).forEach(function (scenario) {
                var scenarioNode = null;
                if (scenario.nodeId) {
                    scenarioNode = _this.nodes[scenario.nodeId]._instance;
                }
                var scene = new Scenario_1.Scenario(scenario.condition, scenarioNode);
                (scenario.steps || []).forEach(function (step) {
                    scene.steps.add(step._instance);
                });
                inst.scenarios.add(scene);
            });
        };
        for (var nodeId in nodes) {
            _loop_1(nodeId);
        }
        for (var nodeId in nodes) {
            var node = nodes[nodeId];
            var inst = node._instance;
            delete node._visited;
            delete node._parent;
            delete node._prev;
            delete node._next;
        }
        return graph._instance;
    };
    Parser.prototype.initNodes = function (parent, nodes) {
        var _this = this;
        (nodes || []).forEach(function (nodeItem, index) {
            if (nodeItem._visited)
                return;
            nodeItem._visited = true;
            if (!nodeItem.id) {
                nodeItem.id = '_node_' + (_this.uniqueNodeId++);
            }
            if (parent)
                nodeItem._parent = parent;
            if (index > 0)
                nodeItem._prev = nodes[index - 1];
            if (nodes.length > index + 1)
                nodeItem._next = nodes[index + 1];
            if (_this.isSubScenario(nodeItem)) {
                console.log("sub-scenario for node: " + nodeItem.id + " [loading sub scenario: " + nodeItem.subScenario + "]");
                var subScenarioPath = path.join(_this.options.scenariosPath, nodeItem.subScenario + '.json');
                var subScenario = require(subScenarioPath);
                extend(true, nodeItem, subScenario);
                _this.updateModels(subScenario.models);
            }
            console.log('node:', nodeItem.id, nodeItem._parent && nodeItem._parent.id ? '[parent: ' + nodeItem._parent.id + ']' : '', nodeItem._next && nodeItem._next.id ? '[next: ' + nodeItem._next.id + ']' : '', nodeItem._prev && nodeItem._prev.id ? '[prev: ' + nodeItem._prev.id + ']' : '');
            _this.recursive(nodeItem);
        });
    };
    Parser.prototype.recursive = function (node) {
        var _this = this;
        if (!node.id) {
            node.id = '_node_' + (this.uniqueNodeId++);
        }
        this.initNodes(node, node.steps);
        (node.scenarios || []).forEach(function (scenario) {
            _this.initNodes(node, scenario.steps);
        });
        if (node.type === 'sequence') {
            this.initNodes(node, node.steps);
        }
        this.nodes[node.id] = node;
    };
    Parser.prototype.isSubScenario = function (nodeItem) {
        if (!nodeItem.subScenario)
            return false;
        var parent = nodeItem._parent;
        while (parent) {
            if (nodeItem.subScenario === parent.id) {
                console.error('recursive subScenario found: ', nodeItem.subScenario);
                throw new Error('recursive subScenario found ' + nodeItem.subScenario);
            }
            parent = parent._parent;
        }
        return true;
    };
    Parser.prototype.updateModels = function (models) {
        var _this = this;
        (models || []).forEach(function (model) {
            _this.models.add(model.name, new Luis_1.LuisModel(model.name, model.url));
        });
    };
    return Parser;
}());
exports.Parser = Parser;
