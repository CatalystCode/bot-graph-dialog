"use strict";
var nodeAPI = require('./Node');
var extend = require('extend');
var strformat = require('strformat');
var common = require('./common');
var Node = nodeAPI.Node;
var List = common.List;
var Navigator = (function () {
    function Navigator(options) {
        this.options = options;
        this.normalizeGraph(options.graph);
    }
    Navigator.prototype.getSteps = function () {
        console.log('get steps');
        return [];
    };
    Navigator.prototype.normalizeGraph = function (origGraph) {
        var graph = {};
        extend(true, graph, origGraph);
        var uniqueNodeId = 1;
        var nodeIds = {};
        console.log('processing scenario:', graph.id);
        recursive(graph);
        for (var nodeId in nodeIds) {
            var node = nodeIds[nodeId];
            var inst = new Node(node);
            node._instance = inst;
        }
        for (var nodeId in nodeIds) {
            var node = nodeIds[nodeId];
            var inst = node._instance;
            if (node._parent)
                inst.parent = node._parent._instance;
            if (node._prev)
                inst.prev = node._prev._instance;
            if (node._next)
                inst.next = node._next._instance;
        }
        this.root = graph._instance;
        for (var nodeId in nodeIds) {
            var node = nodeIds[nodeId];
            var inst = node._instance;
            delete node._instance;
            delete node._visited;
            delete node._parent;
            delete node._prev;
            delete node._next;
        }
        function initNodes(parent, nodes) {
            nodes = nodes || [];
            nodes.forEach(function (nodeItem, index) {
                if (nodeItem._visited)
                    return;
                nodeItem._visited = true;
                if (!nodeItem.id) {
                    nodeItem.id = '_node_' + (uniqueNodeId++);
                }
                if (parent)
                    nodeItem._parent = parent;
                if (index > 0)
                    nodeItem._prev = nodes[index - 1];
                if (nodes.length > index + 1)
                    nodeItem._next = nodes[index + 1];
                console.log('node:', nodeItem.id, nodeItem._parent && nodeItem._parent.id ? '[parent: ' + nodeItem._parent.id + ']' : '', nodeItem._next && nodeItem._next.id ? '[next: ' + nodeItem._next.id + ']' : '', nodeItem._prev && nodeItem._prev.id ? '[prev: ' + nodeItem._prev.id + ']' : '');
                recursive(nodeItem);
            }, this);
        }
        function recursive(node) {
            if (!node.id) {
                node.id = '_node_' + (uniqueNodeId++);
            }
            initNodes(node, node.steps);
            var scenarios = node.scenarios || [];
            scenarios.forEach(function (scenario) {
                initNodes(node, scenario.steps);
            }, this);
            if (node.type === 'sequence') {
                initNodes(node, node.steps);
            }
            nodeIds[node.id] = node;
        }
        function isSubScenario(nodeItem) {
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
        }
    };
    return Navigator;
}());
exports.Navigator = Navigator;
