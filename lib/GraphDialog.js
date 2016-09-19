"use strict";
var Parser_1 = require('./Parser');
var Navigator_1 = require('./Navigator');
var IntentScorer_1 = require('./IntentScorer');
var interfaces = require('./Interfaces');
var builder = require('botbuilder');
var path = require('path');
var strformat = require('strformat');
var NodeType = interfaces.NodeType;
var GraphDialog = (function () {
    function GraphDialog(options) {
        if (options === void 0) { options = {}; }
        this.options = options;
        if (typeof this.options.steps !== 'number') {
            this.options.steps = 100;
        }
        var parser = new Parser_1.Parser(options.parser);
        this.nav = new Navigator_1.Navigator(parser);
        this.intentScorer = new IntentScorer_1.IntentScorer();
    }
    GraphDialog.prototype.getSteps = function () {
        var _this = this;
        console.log('get steps');
        var steps = [];
        for (var i = 0; i < this.options.steps; i++) {
            steps.push(function (session, results, next) { return _this.stepInteractionHandler(session, results, next); });
            steps.push(function (session, results, next) { return _this.stepResultCollectionHandler(session, results, next); });
            steps.push(function (session, results, next) { return _this.setNextStepHandler(session, results, next); });
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
                console.log("sending text for node " + currentNode.id + ", text: '" + text + "'");
                session.send(text);
                return next();
            case NodeType.prompt:
                console.log("builder.ListStyle.button: " + builder.ListStyle["button"]);
                var promptType = currentNode.data.type || 'text';
                builder.Prompts[promptType](session, currentNode.data.text, currentNode.data.options, {
                    listStyle: currentNode.data.config && currentNode.data.config.listStyle && builder.ListStyle[currentNode.data.config.listStyle] || builder.ListStyle.button
                });
                break;
            case NodeType.score:
                var botModels = currentNode.data.models.map(function (model) { return _this.nav.models.get(model); });
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
                var handlerPath = path.join(this.options.parser.handlersPath, handlerName);
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
