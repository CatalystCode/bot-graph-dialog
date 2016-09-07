"use strict";
var nodeAPI = require('./Node');
var scenarioAPI = require('./Scenario');
var path = require('path');
var extend = require('extend');
var strformat = require('strformat');
var common = require('./common');
var Node = nodeAPI.Node;
var List = common.List;
var Navigator = (function () {
    function Navigator(options) {
        this.options = options;
        this.uniqueNodeId = 1;
        this.nodeIds = {};
        this.root = this.normalizeGraph(options.graph);
    }
    Navigator.prototype.getSteps = function () {
        console.log('get steps');
        return [];
    };
    Navigator.prototype.normalizeGraph = function (origGraph) {
        var graph = {};
        extend(true, graph, origGraph);
        console.log('loading scenario:', graph.id);
        this.recursive(graph);
        var nodeIds = this.nodeIds;
        for (var nodeId in nodeIds) {
            var node = nodeIds[nodeId];
            var inst = new Node(node);
            node._instance = inst;
        }
        var _loop_1 = function(nodeId) {
            var node = nodeIds[nodeId];
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
                var scene = new scenarioAPI.Scenario(scenario.condition);
                (scenario.steps || []).forEach(function (step) {
                    scene.steps.add(step._instance);
                });
                inst.scenarios.add(scene);
            });
        };
        for (var nodeId in nodeIds) {
            _loop_1(nodeId);
        }
        for (var nodeId in nodeIds) {
            var node = nodeIds[nodeId];
            var inst = node._instance;
            delete node._instance;
            delete node._visited;
            delete node._parent;
            delete node._prev;
            delete node._next;
        }
        return graph._instance;
    };
    Navigator.prototype.initNodes = function (parent, nodes) {
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
            }
            console.log('node:', nodeItem.id, nodeItem._parent && nodeItem._parent.id ? '[parent: ' + nodeItem._parent.id + ']' : '', nodeItem._next && nodeItem._next.id ? '[next: ' + nodeItem._next.id + ']' : '', nodeItem._prev && nodeItem._prev.id ? '[prev: ' + nodeItem._prev.id + ']' : '');
            _this.recursive(nodeItem);
        });
    };
    Navigator.prototype.recursive = function (node) {
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
        this.nodeIds[node.id] = node;
    };
    Navigator.prototype.isSubScenario = function (nodeItem) {
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
    return Navigator;
}());
exports.Navigator = Navigator;
