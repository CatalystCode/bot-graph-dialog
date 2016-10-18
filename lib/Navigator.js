"use strict";
var n = require('./Node');
var ConditionHandler_1 = require('./ConditionHandler');
var extend = require('extend');
var strformat = require('strformat');
var NodeType = n.NodeType;
var Navigator = (function () {
    function Navigator(parser, options) {
        if (options === void 0) { options = {}; }
        this.parser = parser;
        this.options = options;
        this.models = parser.models;
        this.handlers = parser.handlers;
    }
    Navigator.prototype.getCurrentNode = function (session) {
        console.log('getCurrentNode');
        var currNodeId = session.dialogData._currentNodeId;
        if (!currNodeId) {
            var root = this.parser.root;
            session.dialogData._currentNodeId = root && root.id;
            return root;
        }
        var current = this.parser.getNodeInstanceById(currNodeId);
        return current;
    };
    Navigator.prototype.getNextNode = function (session) {
        console.log('getNextNode');
        var next = null;
        var current = this.parser.getNodeInstanceById(session.dialogData._currentNodeId);
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
    return Navigator;
}());
exports.Navigator = Navigator;
