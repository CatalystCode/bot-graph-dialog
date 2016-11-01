"use strict";
var Node_1 = require("./Node");
var Scenario_1 = require("./Scenario");
var Luis_1 = require("./Luis");
var Common_1 = require("./Common");
var extend = require("extend");
var Promise = require("bluebird");
var Parser = (function () {
    function Parser(options) {
        this.options = options;
        this.uniqueNodeId = 1;
        this.root = null;
        this.nodes = new Common_1.Map();
        this.models = new Common_1.Map();
        this.handlers = new Common_1.Map();
    }
    Parser.prototype.init = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.options.loadScenario(_this.options.scenario)
                .then(function (graph) {
                _this.normalizeGraph(graph).then(function () {
                    return resolve();
                }).catch(function (e) { return reject(e); });
            })
                .catch(function (e) {
                console.error("error loading scenario: " + _this.options + ": " + e.message);
                return reject(e);
            });
        });
    };
    Parser.prototype.getNodeInstanceById = function (id) {
        var node = this.nodes[id];
        return (node && node._instance);
    };
    Parser.prototype.normalizeGraph = function (origGraph) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var graph = {};
            extend(true, graph, origGraph);
            console.log('loading scenario:', graph.id);
            _this.updateModels(graph.models);
            _this.recursive(graph).then(function () {
                var nodes = _this.nodes;
                for (var nodeId in nodes) {
                    var node = nodes[nodeId];
                    var inst = new Node_1.Node(node, node.type);
                    node._instance = inst;
                }
                var _loop_1 = function (nodeId) {
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
                _this.root = graph._instance;
                return resolve();
            }).catch(function (e) { return reject(e); });
        });
    };
    Parser.prototype.initNode = function (parent, nodes, nodeItem, index) {
        var _this = this;
        if (nodeItem._visited)
            return Promise.resolve();
        nodeItem._visited = true;
        if (!nodeItem.id) {
            nodeItem.id = '_node_' + (this.uniqueNodeId++);
        }
        if (parent)
            nodeItem._parent = parent;
        if (index > 0)
            nodeItem._prev = nodes[index - 1];
        if (nodes.length > index + 1)
            nodeItem._next = nodes[index + 1];
        if (this.isSubScenario(nodeItem)) {
            console.log("sub-scenario for node: " + nodeItem.id + " [embedding sub scenario: " + nodeItem.subScenario + "]");
            return new Promise(function (resolve, reject) {
                _this.options.loadScenario(nodeItem.subScenario)
                    .then(function (scenarioObj) {
                    extend(true, nodeItem, scenarioObj);
                    _this.updateModels(scenarioObj.models);
                    console.log('node:', nodeItem.id, nodeItem._parent && nodeItem._parent.id ? '[parent: ' + nodeItem._parent.id + ']' : '', nodeItem._next && nodeItem._next.id ? '[next: ' + nodeItem._next.id + ']' : '', nodeItem._prev && nodeItem._prev.id ? '[prev: ' + nodeItem._prev.id + ']' : '');
                    _this.recursive(nodeItem).then(function () {
                        return resolve();
                    }).catch(function (e) { return reject(e); });
                }).catch(function (e) { return reject(e); });
            });
        }
        else if (nodeItem.type === 'handler') {
            var handler = nodeItem.data.name || '';
            console.log("loading handler for node: " + nodeItem.id + " [embedding sub scenario: " + handler + "]");
            if (nodeItem.data.js) {
                var content = nodeItem.data.js;
                if (Array.isArray(content))
                    content = content.join('\n');
                var func = this.getHandlerFunc(content);
                if (!func) {
                    console.error("error loading handler " + handler);
                }
                this.handlers.add(handler, func);
            }
            else {
                return new Promise(function (resolve, reject) {
                    _this.options.loadHandler(handler)
                        .then(function (text) {
                        var func = _this.getHandlerFunc(text);
                        if (!func) {
                            console.error("error loading handler " + handler);
                            return reject(new Error("error loading handler " + handler));
                        }
                        _this.handlers.add(handler, func);
                        console.log('node:', nodeItem.id, nodeItem._parent && nodeItem._parent.id ? '[parent: ' + nodeItem._parent.id + ']' : '', nodeItem._next && nodeItem._next.id ? '[next: ' + nodeItem._next.id + ']' : '', nodeItem._prev && nodeItem._prev.id ? '[prev: ' + nodeItem._prev.id + ']' : '');
                        _this.recursive(nodeItem).then(function () {
                            return resolve();
                        }).catch(function (e) { return reject(e); });
                    }).catch(function (e) { return reject(e); });
                });
            }
        }
        console.log('node:', nodeItem.id, nodeItem._parent && nodeItem._parent.id ? '[parent: ' + nodeItem._parent.id + ']' : '', nodeItem._next && nodeItem._next.id ? '[next: ' + nodeItem._next.id + ']' : '', nodeItem._prev && nodeItem._prev.id ? '[prev: ' + nodeItem._prev.id + ']' : '');
        return this.recursive(nodeItem);
    };
    Parser.prototype.initNodes = function (parent, nodes) {
        var _this = this;
        return Promise.all((nodes || []).map(function (item, index) { return _this.initNode(parent, nodes, item, index); }));
    };
    Parser.prototype.recursive = function (node) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!node.id) {
                node.id = '_node_' + (_this.uniqueNodeId++);
            }
            _this.initNodes(node, node.steps).then(function () {
                var promises = (node.scenarios || []).map(function (scenario) { return _this.initNodes(node, scenario.steps); });
                Promise.all(promises).then(function () {
                    if (node.type === 'sequence') {
                        _this.initNodes(node, node.steps).then(function () {
                            _this.nodes[node.id] = node;
                            return resolve();
                        }).catch(function (e) { return reject(e); });
                    }
                    else {
                        _this.nodes[node.id] = node;
                        return resolve();
                    }
                }).catch(function (e) { return reject(e); });
            }).catch(function (e) { return reject(e); });
        });
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
    Parser.prototype.getHandlerFunc = function (funcText) {
        var text = "(function(){\n                  return function(module) { \n                    " + funcText + "\n                  }\n                  })()\n                ";
        var wrapperFunc = eval(text);
        var m = {};
        wrapperFunc(m);
        return typeof m.exports === 'function' ? m.exports : null;
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
