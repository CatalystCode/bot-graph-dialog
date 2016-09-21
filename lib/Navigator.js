"use strict";
var builder = require('botbuilder');
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
    Navigator.prototype.getSteps = function () {
        var steps = [];
        for (var i = 0; i < 100; i++) {
            steps.push(this.executeNextStep.bind(this));
        }
        return steps;
    };
    Navigator.prototype.getNext = function (session) {
        var _this = this;
        return function (session, result, skip) {
            _this.executeNextStep(session, result, skip);
        };
    };
    Navigator.prototype.executeNextStep = function (session, result, skip) {
        var currStepType = this.getCurrentStepType(session);
        console.log("executeNextStep: " + currStepType);
        switch (currStepType) {
            case StepTypes.interaction:
                this.setNextStepType(session, StepTypes.collection);
                this.stepInteractionHandler(session, result, skip);
                break;
            case StepTypes.collection:
                this.setNextStepType(session, StepTypes.setNext);
                this.stepResultCollectionHandler(session, result, skip);
                break;
            case StepTypes.setNext:
                this.setNextStepType(session, StepTypes.interaction);
                this.setNextStepHandler(session, result, skip);
                break;
            default:
                throw new Error("Invalid step type: " + currStepType);
        }
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
        console.log("perform action: " + currentNode.id() + ", " + currentNode.type());
        switch (currentNode.type()) {
            case n.NodeTypes.text:
                var text = strformat(currentNode.text(), session.dialogData);
                console.log("sending text for node " + currentNode.id() + ", text: '" + text + "'");
                session.send(text);
                return next();
            case n.NodeTypes.prompt:
                console.log("builder.ListStyle.button: " + builder.ListStyle["button"]);
                var promptType = 'text';
                builder.Prompts[promptType](session, currentNode.text(), {}, {
                    listStyle: builder.ListStyle.button
                });
                break;
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
        switch (currentNode.type()) {
            case n.NodeTypes.prompt:
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
