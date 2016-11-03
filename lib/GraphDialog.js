"use strict";
var Parser_1 = require('./Parser');
var Navigator_1 = require('./Navigator');
var Node_1 = require('./Node');
var IntentScorer_1 = require('./IntentScorer');
var Common_1 = require('./Common');
var builder = require('botbuilder');
var extend = require('extend');
var strformat = require('strformat');
var uuid = require('uuid');
var GraphDialog = (function () {
    function GraphDialog(options) {
        if (options === void 0) { options = {}; }
        this.options = options;
        this.loopDialogName = '__internalLoop';
        if (!options.bot)
            throw new Error('please provide the bot object');
        this.loopDialogName += options.scenario + uuid.v4();
        this.setBotDialog();
        this.intentScorer = new IntentScorer_1.IntentScorer();
        options.customTypeHandlers = options.customTypeHandlers || new Array();
        this.customTypeHandlers = new Common_1.Map();
        for (var i = 0; i < options.customTypeHandlers.length; i++) {
            var handler = options.customTypeHandlers[i];
            this.customTypeHandlers.add(handler.name, handler);
        }
    }
    GraphDialog.prototype.init = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var parser = new Parser_1.Parser(_this.options);
            parser.init().then(function () {
                console.log('parser is ready');
                _this.nav = new Navigator_1.Navigator(parser);
                return resolve(_this);
            }).catch(function (e) { return reject(e); });
        });
    };
    GraphDialog.fromScenario = function (options) {
        if (options === void 0) { options = {}; }
        var graphDialog = new GraphDialog(options);
        return graphDialog.init();
    };
    GraphDialog.prototype.getDialog = function () {
        var _this = this;
        console.log('get dialog');
        return function (session, results, next) {
            console.log('calling loop function for the first time');
            session.replaceDialog('/' + _this.loopDialogName);
        };
    };
    GraphDialog.prototype.setBotDialog = function () {
        var _this = this;
        this.options.bot.dialog('/' + this.loopDialogName, [
            function (session, results, next) {
                if (results && results._dialogDataFlag) {
                    var obj = {};
                    extend(true, obj, results);
                    delete obj._dialogDataFlag;
                    delete obj['BotBuilder.Data.WaterfallStep'];
                    extend(true, session.dialogData, obj);
                }
                return _this.stepInteractionHandler(session, results, next);
            },
            function (session, results, next) {
                return _this.stepResultCollectionHandler(session, results, next);
            },
            function (session, results, next) {
                return _this.setNextStepHandler(session, results, next);
            },
            function (session, results, next) {
                console.log('calling loop function');
                session.dialogData._dialogDataFlag = true;
                session.replaceDialog('/' + _this.loopDialogName, session.dialogData);
            }
        ]);
    };
    GraphDialog.prototype.stepInteractionHandler = function (session, results, next) {
        var _this = this;
        session.dialogData._lastMessage = session.message && session.message.text;
        var currentNode = this.nav.getCurrentNode(session);
        console.log("perform action: " + currentNode.id + ", " + currentNode.type);
        switch (currentNode.type) {
            case Node_1.NodeType.text:
                var text = strformat(currentNode.data.text, session.dialogData);
                console.log("sending text for node " + currentNode.id + ", text: '" + text + "'");
                session.send(text);
                return next();
            case Node_1.NodeType.prompt:
                console.log("builder.ListStyle.button: " + builder.ListStyle["button"]);
                var promptType = currentNode.data.type || 'text';
                builder.Prompts[promptType](session, currentNode.data.text, currentNode.data.options, {
                    listStyle: currentNode.data.config && currentNode.data.config.listStyle && builder.ListStyle[currentNode.data.config.listStyle] || builder.ListStyle.button
                });
                break;
            case Node_1.NodeType.score:
                var botModels = currentNode.data.models.map(function (model) { return _this.nav.models.get(model); });
                var score_text = session.dialogData[currentNode.data.source] || session.dialogData._lastMessage;
                console.log("LUIS scoring for node: " + currentNode.id + ", text: '" + score_text + "' LUIS models: " + botModels);
                this.intentScorer.collectIntents(botModels, score_text, currentNode.data.threashold)
                    .then(function (intents) {
                    if (intents && intents.length) {
                        _this.stepResultCollectionHandler(session, { response: intents[0] }, next);
                    }
                }, function (err) {
                    throw error;
                });
                break;
            case Node_1.NodeType.handler:
                var handlerName = currentNode.data.name;
                var handler = this.nav.handlers.get(handlerName);
                console.log('calling handler: ', currentNode.id, handlerName);
                handler(session, next, currentNode.data);
                break;
            case Node_1.NodeType.sequence:
                return next();
            case Node_1.NodeType.end:
                console.log('ending dialog, node:', currentNode.id);
                session.send(currentNode.data.text || 'Bye bye!');
                session.endDialog();
                break;
            default:
                var customHandler = this.customTypeHandlers.get(currentNode.typeName);
                if (customHandler) {
                    console.log("invoking custom node type handler: " + currentNode.typeName);
                    return customHandler.execute(session, next, currentNode.data);
                }
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
            case Node_1.NodeType.prompt:
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
