"use strict";
var Node_1 = require('./Node');
var Scenario_1 = require('./Scenario');
var ConditionHandler_1 = require('./ConditionHandler');
var Luis_1 = require('./Luis');
var Common_1 = require('./Common');
var path = require('path');
var interfaces = require('./Interfaces');
var extend = require('extend');
var strformat = require('strformat');
var common = require('./common');
var NodeType = interfaces.NodeType;
var List = common.List;
var Navigator = (function () {
    function Navigator(options) {
        this.options = options;
        this.uniqueNodeId = 1;
        this.nodeIds = {};
        this.models = new Common_1.Map();
        this.root = this.normalizeGraph(options.graph);
    }
    Navigator.prototype.getCurrentNode = function (session) {
        console.log('getCurrentNode');
        var currNodeId = session.dialogData._currentNodeId;
        if (!currNodeId) {
            session.dialogData._currentNodeId = this.root.id;
            return this.root;
        }
        var current = this.nodeIds[currNodeId]._instance;
        return current;
    };
    Navigator.prototype.getNextNode = function (session) {
        console.log('getNextNode');
        var next = null;
        var current = this.nodeIds[session.dialogData._currentNodeId]._instance;
        var scenarios = current.scenarios;
        for (var i = 0; i < current.scenarios.size(); i++) {
            var scenario = current.scenarios.get(i);
            if (ConditionHandler_1.ConditionHandler.evaluateExpression(session.dialogData, scenario.condition)) {
                next = scenario.node || scenario.steps.get(0);
            }
        }
        next = next || current.steps.get(0);
        var nodeNavigator = current;
        while (!next && nodeNavigator) {
            next = nodeNavigator.next;
            nodeNavigator = nodeNavigator.parent;
        }
        console.log("getNextNode: [current: " + current.id + ", next: " + (next && next.id) + "]");
        session.dialogData._currentNodeId = next && next.id;
        return next;
    };
    Navigator.prototype.normalizeGraph = function (origGraph) {
        var _this = this;
        var graph = {};
        extend(true, graph, origGraph);
        console.log('loading scenario:', graph.id);
        this.updateModels(graph.models);
        this.recursive(graph);
        var nodeIds = this.nodeIds;
        for (var nodeId in nodeIds) {
            var node = nodeIds[nodeId];
            var inst = new Node_1.Node(node, node.type);
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
                var scenarioNode = null;
                if (scenario.nodeId) {
                    scenarioNode = _this.nodeIds[scenario.nodeId]._instance;
                }
                var scene = new Scenario_1.Scenario(scenario.condition, scenarioNode);
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
                _this.updateModels(subScenario.models);
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
    Navigator.prototype.updateModels = function (models) {
        var _this = this;
        (models || []).forEach(function (model) {
            _this.models.add(model.name, new Luis_1.LuisModel(model.name, model.url));
        });
    };
    return Navigator;
}());
exports.Navigator = Navigator;
