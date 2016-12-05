"use strict";
var ConditionHandler_1 = require('./ConditionHandler');
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
        var currNodeId = session.privateConversationData._currentNodeId;
        if (!currNodeId) {
            var root = this.parser.root;
            session.privateConversationData._currentNodeId = root && root.id;
            return root;
        }
        var current = this.parser.getNodeInstanceById(currNodeId);
        return current;
    };
    Navigator.prototype.getNextNode = function (session) {
        console.log('getNextNode');
        var next = null;
        var current = this.parser.getNodeInstanceById(session.privateConversationData._currentNodeId);
        var scenarios = current.scenarios;
        for (var i = 0; i < current.scenarios.size(); i++) {
            var scenario = current.scenarios.get(i);
            if (ConditionHandler_1.ConditionHandler.evaluateExpression(session.dialogData.data, scenario.condition)) {
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
        session.privateConversationData._currentNodeId = next && next.id;
        return next;
    };
    return Navigator;
}());
exports.Navigator = Navigator;
