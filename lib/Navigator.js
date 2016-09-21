"use strict";
var n = require('./Node');
var strformat = require('strformat');
var StepTypes = {
    interaction: 'interaction',
    collection: 'collection',
    setNext: 'setNext'
};
var SESSION_CURR_NODE_ID_KEY = '_currentNodeId';
var SESSION_CURR_STEP_TYPE_KEY = '_currentStepType';
var SESSION_CURRENT_STEP_TYPE = StepTypes.interaction;
var Navigator = (function () {
    function Navigator(root) {
        this.root = root;
        this.nodes = {};
        if (!root) {
            throw new Error('root node was not provided');
        }
    }
    Navigator.prototype.addNode = function (node) {
        this.nodes[node.id()] = node;
    };
    Navigator.prototype.getNext = function (session) {
        var _this = this;
        return function (session, result, skip) {
            var currStepType = _this.getCurrentStepType(session);
            switch (currStepType) {
                case StepTypes.interaction:
                    _this.stepInteractionHandler(session, result, skip);
                    _this.setNextStepType(session, StepTypes.collection);
                    break;
                case StepTypes.collection:
                    _this.stepResultCollectionHandler(session, result, skip);
                    _this.setNextStepType(session, StepTypes.setNext);
                    break;
                case StepTypes.setNext:
                    _this.setNextStepHandler(session, result, skip);
                    _this.setNextStepType(session, StepTypes.interaction);
                    break;
                default:
                    throw new Error("Invalid step type: " + currStepType);
            }
        };
    };
    Navigator.prototype.getCurrentStepType = function (session) {
        return session.dialogData[SESSION_CURR_STEP_TYPE_KEY] || StepTypes.interaction;
    };
    Navigator.prototype.setNextStepType = function (session, step) {
        return session.dialogData[SESSION_CURR_STEP_TYPE_KEY] = step;
    };
    Navigator.prototype.getCurrentNode = function (session) {
        console.log('getCurrentNode');
        var currNodeId = session.dialogData[SESSION_CURR_NODE_ID_KEY];
        if (!currNodeId) {
            session.dialogData[SESSION_CURR_NODE_ID_KEY] = this.root.id();
            return this.root;
        }
        var current = this.nodes[currNodeId];
        return current;
    };
    Navigator.prototype.stepInteractionHandler = function (session, result, next) {
        session.dialogData._lastMessage = session.message && session.message.text;
        var currentNode = this.getCurrentNode(session);
        console.log("perform action: " + currentNode.id() + ", " + currentNode.type);
        switch (currentNode.type()) {
            case n.NodeType.text:
                var text = strformat(currentNode.data.text, session.dialogData);
                console.log("sending text for node " + currentNode.id() + ", text: '" + text + "'");
                session.send(text);
                return next();
            default:
                var msg = 'Node type ' + currentNode.type() + ' is not recognized';
                console.error(msg);
                var error = new Error(msg);
                console.error(error);
                throw error;
        }
    };
    Navigator.prototype.stepResultCollectionHandler = function (session, results, next) {
        var currentNode = this.getCurrentNode(session);
        var varname = currentNode.varname();
        if (!(results.response && varname))
            return next();
        switch (currentNode.type) {
            default:
                session.dialogData[varname] = results.response;
        }
        console.log('collecting response for node: %s, variable: %s, value: %s', currentNode.id(), varname, session.dialogData[varname]);
        return next();
    };
    Navigator.prototype.setNextStepHandler = function (session, args, next) {
        var nextNode = this.getNextNode(session);
        if (nextNode) {
            console.log("step handler node: " + nextNode.id());
        }
        else {
            console.log('ending dialog');
            session.endDialog();
            return;
        }
        return next();
    };
    Navigator.prototype.getNextNode = function (session) {
        console.log('getNextNode');
        var next = null;
        var current = this.nodes[session.dialogData[SESSION_CURR_NODE_ID_KEY]];
        var nodeNavigator = current;
        while (!next && nodeNavigator) {
            next = nodeNavigator.next();
        }
        console.log("getNextNode: [current: " + current.id() + ", next: " + (next && next.id()) + "]");
        session.dialogData[SESSION_CURR_NODE_ID_KEY] = next && next.id();
        return next;
    };
    return Navigator;
}());
exports.Navigator = Navigator;
