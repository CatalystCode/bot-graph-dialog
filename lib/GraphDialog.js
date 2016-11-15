"use strict";
var Parser_1 = require('./Parser');
var Navigator_1 = require('./Navigator');
var Node_1 = require('./Node');
var IntentScorer_1 = require('./IntentScorer');
var Common_1 = require('./Common');
var builder = require('botbuilder');
var extend = require('extend');
var strformat = require('strformat');
var Validator_1 = require('./Validator');
var uuid = require('uuid');
var GraphDialog = (function () {
    function GraphDialog(options) {
        if (options === void 0) { options = {}; }
        this.options = options;
        this.loopDialogName = '__internalLoop';
        this.validateCurrentNode = false;
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
            case Node_1.NodeType.heroCard:
                session.send(this.generateHeroCardMessage(builder, session, currentNode));
                return next();
            case Node_1.NodeType.carousel:
                session.send(this.generateCarouselMessage(builder, session, currentNode));
                return next();
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
    GraphDialog.prototype.generateHeroCard = function (builder, session, data) {
        var hero = new builder.HeroCard(session);
        if ("undefined" != typeof data.title) {
            hero.title(data.title);
        }
        if ("undefined" != typeof data.subtitle) {
            hero.subtitle(data.subtitle);
        }
        if ("undefined" != typeof data.text) {
            hero.text(data.text);
        }
        if ("undefined" != typeof data.images[0] && data.images.length > 0) {
            hero.images([
                builder.CardImage.create(session, data.images[0])
            ]);
        }
        if ("undefined" != typeof data.tap) {
            switch (data.tap.action) {
                case "openUrl":
                    hero.tap(builder.CardAction.openUrl(session, data.tap.value));
                    break;
            }
        }
        if ("undefined" != typeof data.buttons) {
            var buttons = [];
            data.buttons.forEach(function (item, index) {
                switch (item.action) {
                    case "openUrl":
                        buttons.push(builder.CardAction.openUrl(session, item.value, item.label));
                        break;
                    case "imBack":
                        buttons.push(builder.CardAction.imBack(session, item.value, item.label));
                        break;
                }
            });
            if (buttons.length > 0) {
                hero.buttons(buttons);
            }
        }
        return hero;
    };
    GraphDialog.prototype.generateHeroCardMessage = function (builder, session, node) {
        var hero = this.generateHeroCard(builder, session, node.data);
        return new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachments([hero]);
    };
    GraphDialog.prototype.generateCarouselMessage = function (builder, session, node) {
        var _this = this;
        var data = node.data;
        if ("undefined" != typeof data.text) {
            var text = strformat(data.text, session.dialogData);
            session.send(text);
        }
        if ("undefined" != typeof data.cards && data.cards.length > 0) {
            var cards = [];
            data.cards.forEach(function (item, index) {
                cards.push(_this.generateHeroCard(builder, session, item.data));
            });
            return new builder.Message(session)
                .textFormat(builder.TextFormat.xml)
                .attachmentLayout(builder.AttachmentLayout.carousel)
                .attachments(cards);
        }
    };
    GraphDialog.prototype.stepResultCollectionHandler = function (session, results, next) {
        var currentNode = this.nav.getCurrentNode(session);
        var varname = currentNode.varname;
        if (!(results.response && varname))
            return next();
        if ("undefined" != typeof currentNode.data.validation && "undefined" != typeof currentNode.data.validation.type) {
            var invalidMsg = "undefined" != typeof currentNode.data.validation.setup.invalid_msg ? currentNode.data.validation.setup.invalid_msg : 'Invalid value';
            var isValid = Validator_1.Validator.validate(currentNode.data.validation.type, results.response, currentNode.data.validation.setup);
            if (false == isValid) {
                session.send(invalidMsg);
                this.validateCurrentNode = true;
                return next();
            }
        }
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
        var nextNode;
        if (this.validateCurrentNode) {
            nextNode = this.nav.getCurrentNode(session);
            this.validateCurrentNode = false;
        }
        else {
            nextNode = this.nav.getNextNode(session);
        }
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
