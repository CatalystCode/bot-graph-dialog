"use strict";
var navigator = require('./Navigator');
var node = require('./Node');
var IntentScorer = require('./IntentScorer');
var builder = require('botbuilder');
var path = require('path');
var strformat = require('strformat');
var NodeType = node.NodeType;
var GraphDialog = (function () {
    function GraphDialog(options) {
        this.options = options;
        this.nav = new navigator.Navigator(options);
        this.intentScorer = new IntentScorer.IntentScorer();
        options.steps = options.steps || 100;
    }
    GraphDialog.prototype.getSteps = function () {
        console.log('get steps');
        var steps = [];
        for (var i = 0; i < this.options.steps; i++) {
            steps.push(this.stepInteractionHandler.bind(this));
            steps.push(this.stepResultCollectionHandler.bind(this));
            steps.push(this.setNextStepHandler.bind(this));
        }
        return steps;
    };
    GraphDialog.prototype.stepInteractionHandler = function (session, results, next) {
        var _this = this;
        session.dialogData._lastMessage = session.message && session.message.text;
        var currentNode = this.nav.getCurrentNode(session);
        console.log("perform action: " + currentNode.id + ", " + currentNode.type);
        switch (currentNode.type) {
            case NodeType.text:
                var text = strformat(currentNode.data.text, session.dialogData);
                console.log('sending text for node %s, text: \'%s\'', currentNode.id, text);
                session.send(text);
                return next();
            case NodeType.prompt:
                console.log('builder.ListStyle.button', builder.ListStyle["button"]);
                var promptType = currentNode.data.type || 'text';
                builder.Prompts[promptType](session, currentNode.data.text, currentNode.data.options, {
                    listStyle: currentNode.data.config && currentNode.data.config.listStyle && builder.ListStyle[currentNode.data.config.listStyle] || builder.ListStyle.button
                });
                break;
            case NodeType.score:
                var botModels = currentNode.data.models.map(function (model) { return _this.nav.models[model]; });
                var text = session.dialogData[currentNode.data.source] || session.dialogData._lastMessage;
                console.log("LUIS scoring for node: " + currentNode.id + ", text: '" + text + "' LUIS models: " + botModels);
                this.intentScorer.collectIntents(botModels, text, currentNode.data.threashold)
                    .then(function (intents) {
                    if (intents && intents.length) {
                        _this.stepResultCollectionHandler(session, { response: intents[0] }, next);
                    }
                }, function (err) {
                    throw error;
                });
                break;
            case NodeType.handler:
                var handlerName = currentNode.data.name;
                var handlerPath = path.join(this.options.handlersPath, handlerName);
                var handler = require(handlerPath);
                console.log('calling handler: ', currentNode.id, handlerName);
                return handler(session, next, currentNode.data);
            case NodeType.sequence:
                return next();
            case NodeType.end:
                console.log('ending dialog, node:', currentNode.id);
                session.send(currentNode.data.text || 'Bye bye!');
                session.endDialog();
                break;
            default:
                var msg = 'Node type ' + currentNode.type + ' is not recognized';
                console.error(msg);
                var error = new Error(msg);
                console.error(error);
                throw error;
        }
    };
    GraphDialog.prototype.stepResultCollectionHandler = function (session, results, next) {
        var currentNode = this.nav.getCurrentNode(session);
        var varname = currentNode.varname;
        if (!(results.response && varname))
            return next();
        switch (currentNode.type) {
            case NodeType.prompt:
                switch (currentNode.data.type) {
                    case 'time':
                        session.dialogData[varname] = builder.EntityRecognizer.resolveTime([results.response]);
                        break;
                    case 'choice':
                        session.dialogData[varname] = results.response.entity;
                        break;
                    default:
                        session.dialogData[varname] = results.response;
                }
                break;
            default:
                session.dialogData[varname] = results.response;
        }
        console.log('collecting response for node: %s, variable: %s, value: %s', currentNode.id, varname, session.dialogData[varname]);
        return next();
    };
    GraphDialog.prototype.setNextStepHandler = function (session, args, next) {
        var nextNode = this.nav.getNextNode(session);
        if (nextNode) {
            console.log("step handler node: " + nextNode.id);
        }
        else {
            console.log('ending dialog');
            session.endDialog();
            return;
        }
        return next();
    };
    return GraphDialog;
}());
exports.GraphDialog = GraphDialog;
