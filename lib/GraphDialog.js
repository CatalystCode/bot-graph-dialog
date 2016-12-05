"use strict";
var Parser_1 = require('./Parser');
var Navigator_1 = require('./Navigator');
var Node_1 = require('./Node');
var IntentScorer_1 = require('./IntentScorer');
var Common_1 = require('./Common');
var Validator_1 = require('./Validator');
var builder = require('botbuilder');
var strformat = require('strformat');
var uuid = require('uuid');
var GraphDialog = (function () {
    function GraphDialog(options) {
        if (options === void 0) { options = {}; }
        this.options = options;
        this.validateCurrentNode = false;
        this.parser = null;
        if (!options.bot)
            throw new Error('please provide the bot object');
        this.intentScorer = new IntentScorer_1.IntentScorer();
        options.customTypeHandlers = options.customTypeHandlers || new Array();
        this.internalPath = '/_' + uuid.v4();
        this.setBotDialog();
        this.customTypeHandlers = new Common_1.Map();
        for (var i = 0; i < options.customTypeHandlers.length; i++) {
            var handler = options.customTypeHandlers[i];
            this.customTypeHandlers.add(handler.name, handler);
        }
    }
    GraphDialog.prototype.getDialogVersion = function () {
        return this.parser ? this.parser.version : null;
    };
    GraphDialog.prototype.getDialogId = function () {
        return this.parser ? this.parser.root.id : null;
    };
    GraphDialog.prototype.init = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.parser = new Parser_1.Parser(_this.options);
            _this.parser.init().then(function () {
                console.log('parser is ready');
                _this.nav = new Navigator_1.Navigator(_this.parser);
                return resolve(_this);
            }).catch(function (e) { return reject(e); });
        });
    };
    GraphDialog.fromScenario = function (options) {
        if (options === void 0) { options = {}; }
        var graphDialog = new GraphDialog(options);
        return graphDialog.init();
    };
    GraphDialog.prototype.reload = function () {
        return this.init();
    };
    GraphDialog.prototype.restartDialog = function (session) {
        session.privateConversationData = {};
        console.log('calling loop function after restarting dialog');
        var dialogIndex = -1;
        var callstack = session.sessionState.callstack || [];
        for (var i = callstack.length - 1; i >= 0; i--) {
            var item = callstack[i];
            var path_1 = item.id.split('*:')[1];
            if (path_1 === this.internalPath) {
                dialogIndex = i;
                break;
            }
        }
        ;
        session.cancelDialog(dialogIndex, this.internalPath);
    };
    GraphDialog.prototype.getDialog = function () {
        var _this = this;
        console.log('get dialog');
        return function (session, results, next) {
            console.log('calling loop function for the first time');
            session.beginDialog(_this.internalPath);
        };
    };
    GraphDialog.prototype.setBotDialog = function () {
        var _this = this;
        this.options.bot.dialog(this.internalPath, [
            function (session, args, next) {
                session.dialogData.data = args || {};
                if (_this.options.onBeforeProcessingStep)
                    return _this.options.onBeforeProcessingStep.call(_this, session, args, next);
                else
                    return next();
            },
            function (session, args, next) {
                return _this.stepInteractionHandler(session, args, next);
            },
            function (session, args, next) {
                return _this.stepResultCollectionHandler(session, args, next);
            },
            function (session, args, next) {
                return _this.setNextStepHandler(session, args, next);
            },
            function (session, args, next) {
                if (_this.options.onAfterProcessingStep)
                    return _this.options.onAfterProcessingStep.call(_this, session, args, next);
                else
                    return next();
            },
            function (session, args, next) {
                console.log('calling loop function');
                session.replaceDialog(_this.internalPath, session.dialogData.data);
            }
        ]);
    };
    GraphDialog.prototype.stepInteractionHandler = function (session, results, next) {
        var _this = this;
        session.privateConversationData._lastMessage = session.message && session.message.text;
        var currentNode = this.nav.getCurrentNode(session);
        console.log("perform action: " + currentNode.id + ", " + currentNode.type);
        switch (currentNode.type) {
            case Node_1.NodeType.text:
                var text = strformat(currentNode.data.text, session.dialogData.data);
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
                var score_text = session.dialogData.data[currentNode.data.source] || session.privateConversationData._lastMessage;
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
                session.endConversation();
                break;
            case Node_1.NodeType.heroCard:
                session.send(this.generateHeroCardMessage(session, currentNode));
                return next();
            case Node_1.NodeType.carousel:
                session.send(this.generateCarouselMessage(session, currentNode));
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
    GraphDialog.prototype.generateHeroCard = function (session, data) {
        var hero = new builder.HeroCard(session);
        if (data.title) {
            hero.title(data.title);
        }
        if (data.subtitle) {
            hero.subtitle(data.subtitle);
        }
        if (data.text) {
            hero.text(data.text);
        }
        if (data.images && data.images.length > 0) {
            hero.images([
                builder.CardImage.create(session, data.images[0])
            ]);
        }
        if (data.tap) {
            switch (data.tap.action) {
                case "openUrl":
                    hero.tap(builder.CardAction.openUrl(session, data.tap.value));
                    break;
            }
        }
        if (data.buttons) {
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
    GraphDialog.prototype.generateHeroCardMessage = function (session, node) {
        var hero = this.generateHeroCard(session, node.data);
        return new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachments([hero]);
    };
    GraphDialog.prototype.generateCarouselMessage = function (session, node) {
        var _this = this;
        var data = node.data;
        if (data.text) {
            var text = strformat(data.text, session.dialogData.data);
            session.send(text);
        }
        if (data.cards && data.cards.length > 0) {
            var cards = [];
            data.cards.forEach(function (item, index) {
                cards.push(_this.generateHeroCard(session, item.data));
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
        if (currentNode.data.validation && currentNode.data.validation.type) {
            var invalidMsg = currentNode.data.validation.setup.invalid_msg ? currentNode.data.validation.setup.invalid_msg : 'Invalid value';
            var isValid = Validator_1.Validator.validate(currentNode.data.validation.type, results.response, currentNode.data.validation.setup);
            if (!isValid) {
                session.send(invalidMsg);
                this.validateCurrentNode = true;
                return next();
            }
        }
        var value = null;
        switch (currentNode.type) {
            case Node_1.NodeType.prompt:
                switch (currentNode.data.type) {
                    case 'time':
                        value = builder.EntityRecognizer.resolveTime([results.response]);
                        break;
                    case 'choice':
                        value = results.response.entity;
                        break;
                    default:
                        value = results.response;
                }
                break;
            default:
                value = results.response;
        }
        session.dialogData.data[varname] = value;
        console.log('collecting response for node: %s, variable: %s, value: %s', currentNode.id, varname, value);
        return next();
    };
    GraphDialog.prototype.setNextStepHandler = function (session, args, next) {
        var nextNode = null;
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
            return session.endConversation();
        }
        return next();
    };
    return GraphDialog;
}());
exports.GraphDialog = GraphDialog;
