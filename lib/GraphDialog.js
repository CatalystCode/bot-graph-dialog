"use strict";

var util = require('util');
var builder = require('botbuilder');
var strformat = require('strformat');
var uuid = require('uuid');

var Parser = require('./Parser');
var Navigator = require('./Navigator');
var Node = require('./Node');
var IntentScorer = require('./IntentScorer');
var Common = require('./Common');
var Validator = require('./Validator');

class GraphDialog {

  constructor(options) {
    this.options = options = options || {};
    if (!options.bot) throw new Error('please provide the bot object');
    this.validateCurrentNode = false;
    this.parser = null;
    options.customTypeHandlers = options.customTypeHandlers || [];
    this.internalPath = '/_' + uuid.v4();

    this.setBotDialog();

    this.customTypeHandlers = new Common.Map();
    for (let handler of options.customTypeHandlers) {
      this.customTypeHandlers.add(handler.name, handler);
    }
  }

  getDialogVersion() {
    return this.parser ? this.parser.version : null;
  }

  getDialogId() {
    return this.parser ? this.parser.root.id : null;
  }

  async init() {
    try {
      this.parser = new Parser(this.options);
      await this.parser.init();
      console.log('parser is ready');
      this.nav = new Navigator(this.parser);
      return this;
    }
    catch(err) {
      throw new Error(`error initializing parser. options: ${util.inspect(this.options)}, error: ${err.message}`);
    }
  }

  static async fromScenario(options = {}) {
    var graphDialog = new GraphDialog(options);
    return await graphDialog.init();
  }

  async reload() {
    return this.init();
  }

  restartDialog(session) {
    console.log('calling loop function after restarting dialog');
    
    session.privateConversationData = {};
    var dialogIndex = -1;
    var callstack = session.sessionState.callstack || [];
    
    for (var i = callstack.length - 1; i >= 0; i--) {
      var item = callstack[i];
      var path = item.id.split('*:')[1];
      if (path === this.internalPath) {
        dialogIndex = i;
        break;
      }
    };

    session.cancelDialog(dialogIndex, this.internalPath);
  }
    
  
  getDialog() {
    console.log('get dialog');
    return (session, results, next) => {
      console.log('calling loop function for the first time');
      session.beginDialog(this.internalPath);
    };
  }

  setBotDialog() {
    var _this = this;
    this.options.bot.dialog(this.internalPath, [
      async (session, args, next) => {
        session.dialogData.data = args || {};
        if (typeof _this.options.onBeforeProcessingStep === 'function')
          return await _this.options.onBeforeProcessingStep.call(_this, session, args, next);
        else
          return next();
      },
      async (session, args, next) => {
        return await _this.stepInteractionHandler(session, args, next);
      },
     (session, args, next) => {
        return _this.stepResultCollectionHandler(session, args, next);
      },
      async (session, args, next) => {
        return _this.setNextStepHandler(session, args, next);
      },
      async (session, args, next) => {
        if (typeof _this.options.onAfterProcessingStep === 'function')
          return await _this.options.onAfterProcessingStep.call(_this, session, args, next);
        else
          return next();
      },
      (session, args, next) => {
        console.log('calling loop function');
        session.replaceDialog(_this.internalPath, session.dialogData.data);
      }
    ]);
  }

  async stepInteractionHandler(session, results, next) {
    //var _this = this;
    session.privateConversationData._lastMessage = session.message && session.message.text;
    var currentNode = this.nav.getCurrentNode(session);
    console.log("perform action: " + currentNode.id + ", " + currentNode.type);
    
    switch (currentNode.type) {

      case Node.NodeType.text:
        var text = strformat(currentNode.data.text, session.dialogData.data);
        console.log("sending text for node " + currentNode.id + ", text: '" + text + "'");
        session.send(text);
        return next();

      case Node.NodeType.prompt:
        console.log("builder.ListStyle.button: " + builder.ListStyle["button"]);
        var promptType = currentNode.data.type || 'text';
        builder.Prompts[promptType](session, currentNode.data.text, currentNode.data.options, {
          listStyle: currentNode.data.config && currentNode.data.config.listStyle && builder.ListStyle[currentNode.data.config.listStyle] || builder.ListStyle.button
        });
        break;

      case Node.NodeType.score:
        // TODO: check the map with 'this'
        var botModels = currentNode.data.models.map(model => this.nav.models.get(model));
        var score_text = session.dialogData.data[currentNode.data.source] || session.privateConversationData._lastMessage;
        console.log("LUIS scoring for node: " + currentNode.id + ", text: '" + score_text + "' LUIS models: " + botModels);
        var intents = await IntentScorer.collectIntents(botModels, score_text, currentNode.data.threashold);
        if (intents && intents.length) {
          this.stepResultCollectionHandler(session, { response: intents[0] }, next);
        }
        break;

      case Node.NodeType.handler:
        var handlerName = currentNode.data.name;
        var handler = this.nav.handlers.get(handlerName);
        console.log('calling handler: ', currentNode.id, handlerName);
        handler(session, next, currentNode.data);
        break;

      case Node.NodeType.sequence:
        return next();

      case Node.NodeType.end:
        console.log('ending dialog, node:', currentNode.id);
        session.send(currentNode.data.text || 'Bye bye!');
        session.endConversation();
        break;

      case Node.NodeType.heroCard:
        session.send(this.generateHeroCardMessage(session, currentNode));
        return next();

      case Node.NodeType.carousel:
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
        throw new Error(msg);
        
    }
  }

  
  generateHeroCard(session, data) {
    var hero = new builder.HeroCard(session);
    
    if (data.title) hero.title(data.title);
    if (data.subtitle) hero.subtitle(data.subtitle); 
    if (data.text) hero.text(data.text);
    
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
      for (let item of data.buttons) {
        switch (item.action) {
          case "openUrl":
            buttons.push(builder.CardAction.openUrl(session, item.value, item.label));
            break;
          case "imBack":
            buttons.push(builder.CardAction.imBack(session, item.value, item.label));
            break;
        }
      }

      if (buttons.length > 0) {
        hero.buttons(buttons);
      }
    }
    return hero;
  }

  generateHeroCardMessage(session, node) {
    var hero = this.generateHeroCard(session, node.data);
    return new builder.Message(session)
      .textFormat(builder.TextFormat.xml)
      .attachments([hero]);
  };

  generateCarouselMessage(session, node) {
    //var _this = this;
    var data = node.data;
    
    if (data.text) {
      var text = strformat(data.text, session.dialogData.data);
      session.send(text);
    }

    if (data.cards && data.cards.length > 0) {
      var cards = [];
      for (let item of data.cards) {
        cards.push(this.generateHeroCard(session, item.data));
      }

      return new builder.Message(session)
        .textFormat(builder.TextFormat.xml)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(cards);
    }
  }

  stepResultCollectionHandler(session, results, next) {
    var currentNode = this.nav.getCurrentNode(session);
    var varname = currentNode.varname;
    
    if (!(results.response && varname))
        return next();

    if (currentNode.data.validation && currentNode.data.validation.type) {
      var invalidMsg = currentNode.data.validation.setup.invalid_msg ? currentNode.data.validation.setup.invalid_msg : 'Invalid value';
      var isValid = Validator.validate(currentNode.data.validation.type, results.response, currentNode.data.validation.setup);
      if (!isValid) {
        session.send(invalidMsg);
        this.validateCurrentNode = true;
        return next();
      }
    }

    var value = null;
    switch (currentNode.type) {
      case Node.NodeType.prompt:
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

  setNextStepHandler(session, args, next) {
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
  }

}

module.exports = GraphDialog;
