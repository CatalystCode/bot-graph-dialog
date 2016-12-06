
import { Parser } from './Parser';
import { INavigatorOptions, Navigator } from './Navigator';
import { NodeType, INode } from './Node';
import { IIntentScorer, IntentScorer } from './IntentScorer';
import { ICustomNodeTypeHandler, CustomNodeTypeHandler } from './Action';
import { Map, List } from './Common';
import { Validator } from './Validator';
import * as builder from 'botbuilder';
import * as path from 'path';
import * as extend from 'extend';
import * as strformat from 'strformat';


var uuid = require('uuid');


/**
 * Interface for {IGraphDialog} options object
 * 
 * @export
 * @interface IGraphDialogOptions
 * @extends {INavigatorOptions}
 */
export interface IGraphDialogOptions extends INavigatorOptions { 
	/**
	 * The bot object
	 * 
	 * @type {builder.UniversalBot}
	 * @memberOf IGraphDialogOptions
	 */
	bot?: builder.UniversalBot;
  /**
   * list of {ICustomNodeTypeHandler} objects
   * 
   * @type {ICustomNodeTypeHandler[]}
   * @memberOf IGraphDialogOptions
   */
  customTypeHandlers?: ICustomNodeTypeHandler[];
  /**
   * a {IHandler} objects for custom logics before a step is being processed
   * 
   * @type {IHandler}
   * @memberOf IGraphDialogOptions
   */
  onBeforeProcessingStep?: IHandler;
    /**
   * a {IHandler} objects for custom logics after a step is being processed
   * 
   * @type {IHandler}
   * @memberOf IGraphDialogOptions
   */
  onAfterProcessingStep?: IHandler;
}

/**
 * Interface to define a custom node handler
 * 
 * @export
 * @interface IHandler
 */
export interface IHandler {
    (session: builder.Session, results, next): void
}

/**
 * Interface to define a step function
 * 
 * @interface IStepFunction
 */
interface IStepFunction {
  (session: builder.Session, results, next): void;
}

/**
 * Interface for {GraphDialog} class
 * 
 * @export
 * @interface IGraphDialog
 */
export interface IGraphDialog {
  /**
   * Init graph dialog
   * 
   * @returns {Promise<IGraphDialog>}
   * 
   * @memberOf IGraphDialog
   */
  init(): Promise<IGraphDialog>;
  /**
   * Gets the resulting dialog to attach on the bot
   * 
   * @returns {IStepFunction}
   * 
   * @memberOf IGraphDialog
   */
  getDialog(): IStepFunction;
  /**
   * Gets the dialog version from the scenario's json
   * 
   * @returns {string}
   * 
   * @memberOf IGraphDialog
   */
  getDialogVersion(): string;
  /**
   * Gets the the dialog id from the scenario's json
   * 
   * @returns {string}
   * 
   * @memberOf IGraphDialog
   */
  getDialogId(): string;
  /**
   * Cancel the flow of the existing dialog and starts a new one
   * 
   * @returns {void}
   * 
   * @memberOf IGraphDialog
   */
  restartDialog(session: builder.Session): void;
  /**
   * Reloads scenarios for this instance.
   * Use this when the scenarios were updated on the remote data source.
   * After calling this method you'll probably want to call the restartDialog API to restart the updated dialog.
   * 
   * @returns {Promise<IGraphDialog>}
   * 
   * @memberOf IGraphDialog
   */
  reload(): Promise<IGraphDialog>;
}


/**
 * The Graph Dialog class manages the dialog's state
 * 
 * @export
 * @class GraphDialog
 * @implements {IGraphDialog}
 */
export class GraphDialog implements IGraphDialog {

	/**
	 * 
	 * 
	 * @private
	 * @type {Navigator}
	 * @memberOf GraphDialog
	 */
	private nav: Navigator;
  /**
   * 
   * 
   * @private
   * @type {IIntentScorer}
   * @memberOf GraphDialog
   */
  private intentScorer: IIntentScorer;
	/**
	 * 
	 * 
	 * @private
	 * 
	 * @memberOf GraphDialog
	 */
	private done: () => any;
  /**
   * 
   * 
   * @private
   * @type {Map<ICustomNodeTypeHandler>}
   * @memberOf GraphDialog
   */
  private customTypeHandlers: Map<ICustomNodeTypeHandler>;

  /**
   * If set to true, will not travel to next step as the current step needs to be validated
   *
   * @private
   * @type {boolean}
   */
  private validateCurrentNode: boolean = false;

  private parser: Parser = null;
  private internalPath: string;

	/**
	 * Creates an instance of GraphDialog.
	 * 
	 * @param {IGraphDialogOptions} [options={}]
	 * 
	 * @memberOf GraphDialog
	 */
	constructor(private options: IGraphDialogOptions = {}) {
   if (!options.bot) throw new Error('please provide the bot object');
     this.intentScorer = new IntentScorer();

    // Initialize custom handlers
    options.customTypeHandlers = options.customTypeHandlers || new Array<ICustomNodeTypeHandler>();
    this.internalPath = '/_' + uuid.v4();
    this.setBotDialog();

    this.customTypeHandlers = new Map<CustomNodeTypeHandler>();
    for (let i=0; i < options.customTypeHandlers.length; i++) {
      let handler = <ICustomNodeTypeHandler>options.customTypeHandlers[i];
      this.customTypeHandlers.add(handler.name, handler);
    }
	}

  public getDialogVersion(): string {
    return this.parser ? this.parser.version : null;
  }

  public getDialogId(): string {
    return this.parser ? this.parser.root.id : null;
  }

  /**
   * Initialize a graph based on graph options like a predefined JSON schema
   * 
   * @returns {Promise<any>}
   * 
   * @memberOf GraphDialog
   */
  public init(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.parser = new Parser(this.options);
      this.parser.init().then(() => {
        console.log('parser is ready');
        this.nav = new Navigator(this.parser);
        return resolve(this);
      }).catch(e => reject(e));
    });
  }

	/**
	 * Generate a new graph dialog constructed based on a scenario name
	 * 
	 * @static
	 * @param {IGraphDialogOptions} [options={}]
	 * @returns {Promise<IGraphDialog>}
	 * 
	 * @memberOf GraphDialog
	 */
	public static fromScenario(options: IGraphDialogOptions = {}): Promise<IGraphDialog> {
		let graphDialog = new GraphDialog(options);
    return graphDialog.init();
	}

  public reload(): Promise<IGraphDialog> {
    return this.init();
  }

  public restartDialog(session: builder.Session): void {

    session.privateConversationData = {};
    console.log('calling loop function after restarting dialog');
    
    // find this dialog on the callstack
    let dialogIndex = -1;
    let callstack = session.sessionState.callstack || []; 

    for (let i=callstack.length-1; i>=0; i--) {
      let item = callstack[i];
      let path = item.id.split('*:')[1];
      if (path === this.internalPath) {
        dialogIndex = i;
        break;
      }
    };
    
    session.cancelDialog(dialogIndex, this.internalPath);
  }

  /**
   * Returns the dialog steps to bind to the bot object
   * 
   * @returns {IStepFunction}
   * 
   * @memberOf GraphDialog
   */
  public getDialog(): IStepFunction {
		console.log('get dialog');
    return (session: builder.Session, results, next) => {
        console.log('calling loop function for the first time');
        session.beginDialog(this.internalPath);
    };
  }

 /**
   * This is where the magic happens. Loops this list of steps for each node.
   * 
   * @private
   * 
   * @memberOf GraphDialog
   */
  private setBotDialog(): void {

    this.options.bot.dialog(this.internalPath, [
      (session, args, next) => { 
        session.dialogData.data = args || {};
        if (this.options.onBeforeProcessingStep)
          return this.options.onBeforeProcessingStep.call(this, session, args, next); 
        else return next();
      },
      (session, args, next) => { 
        return this.stepInteractionHandler(session, args, next); 
      },
      (session, args, next) => { 
        return this.stepResultCollectionHandler(session, args, next); 
      },
      (session, args, next) => { 
        return this.setNextStepHandler(session, args, next); 
      },
      (session, args, next) => { 
        if (this.options.onAfterProcessingStep)
          return this.options.onAfterProcessingStep.call(this, session, args, next); 
        else return next();
      },
      (session, args, next) => {
        console.log('calling loop function');
        session.replaceDialog(this.internalPath, session.dialogData.data);
      }
    ]);
  }

  /**
   * This is where the bot interacts with the user
   * 
   * @private
   * @param {builder.Session} session
   * @param {any} results
   * @param {any} next
   * @returns {void}
   * 
   * @memberOf GraphDialog
   */
  private stepInteractionHandler(session: builder.Session, results, next): void {
    session.privateConversationData._lastMessage = session.message && session.message.text;
    let currentNode = this.nav.getCurrentNode(session);
    console.log(`perform action: ${currentNode.id}, ${currentNode.type}`);

    switch (currentNode.type) {

      case NodeType.text:
        var text = strformat(currentNode.data.text, session.dialogData.data);
        console.log(`sending text for node ${currentNode.id}, text: \'${text}\'`);
        session.send(text);
        return next();

      case NodeType.prompt:
        console.log(`builder.ListStyle.button: ${builder.ListStyle["button"]}`); 
        var promptType = currentNode.data.type || 'text';
        builder.Prompts[promptType](
          session, 
          currentNode.data.text, 
          currentNode.data.options, 
          { 
            listStyle: currentNode.data.config && currentNode.data.config.listStyle && builder.ListStyle[currentNode.data.config.listStyle] || builder.ListStyle.button 
          });
        break;
        
      case NodeType.score:
        /**
         * gets list of models
         * 
         * @param {any} model
         */
        var botModels = currentNode.data.models.map(model => this.nav.models.get(model));
        
        var score_text = session.dialogData.data[currentNode.data.source] || session.privateConversationData._lastMessage;
        console.log(`LUIS scoring for node: ${currentNode.id}, text: \'${score_text}\' LUIS models: ${botModels}`);

        this.intentScorer.collectIntents(botModels, score_text, currentNode.data.threashold)
          .then(intents => {
              if (intents && intents.length) {
                this.stepResultCollectionHandler(session, { response: intents[0] }, next);
              }
            },
            function (err) {
              throw error;
            }
          );
          
        break;

      case NodeType.handler:
        var handlerName = currentNode.data.name;
        let handler: IHandler = <IHandler>this.nav.handlers.get(handlerName);
        console.log('calling handler: ', currentNode.id, handlerName);
        handler(session, next, currentNode.data);
        break;
    
      case NodeType.sequence:
        return next();

      case NodeType.end:
        console.log('ending dialog, node:', currentNode.id);
        session.send(currentNode.data.text || 'Bye bye!');
        session.endConversation(); // this will also clear the privateConversationData 
        break;

      case NodeType.heroCard:
        session.send(this.generateHeroCardMessage(session, currentNode));
        return next();

      case NodeType.carousel:
        session.send(this.generateCarouselMessage(session, currentNode));
        return next();

      default:

        let customHandler: ICustomNodeTypeHandler = this.customTypeHandlers.get(currentNode.typeName);
        if (customHandler) {
          console.log(`invoking custom node type handler: ${currentNode.typeName}`);
          return customHandler.execute(session, next, currentNode.data);
        }

        var msg = 'Node type ' + currentNode.type + ' is not recognized';
        console.error(msg);
        var error = new Error(msg);
        console.error(error);
        throw error; 
    }  
  }


  /**
   * Generates a HeroCard (to be attached to a Message)
   *
   * @param session
   * @param data
   * @returns {HeroCard}
   */
  private generateHeroCard(session: builder.Session, data: any) {
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
      data.buttons.forEach((item, index) => {
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
  }

  /**
   * Generates a HeroCard Message
   *
   * @param session
   * @param node
   * @returns {Message}
   */
  private generateHeroCardMessage(session: builder.Session, node: INode) {
    var hero = this.generateHeroCard(session, node.data);

    return new builder.Message(session)
      .textFormat(builder.TextFormat.xml)
      .attachments([hero]);
  }

  /**
   * Generates a Carousel Message
   *
   * @param session
   * @param node
   * @returns {Message}
   */
  private generateCarouselMessage(session: builder.Session, node: INode) {
    var data = node.data;

    if (data.text) {
      var text = strformat(data.text, session.dialogData.data);
      session.send(text);
    }

    if (data.cards && data.cards.length > 0) {
      var cards = [];
      data.cards.forEach((item, index) => {
        cards.push(this.generateHeroCard(session, item.data));
      });

      return new builder.Message(session)
        .textFormat(builder.TextFormat.xml)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(cards);
    }
  }

  /**
   * Handling collection of the user input
   * 
   * @private
   * @param {builder.Session} session
   * @param {any} results
   * @param {any} next
   * @returns
   * 
   * @memberOf GraphDialog
   */
  private stepResultCollectionHandler(session: builder.Session, results, next) {
    let currentNode = this.nav.getCurrentNode(session);
    let varname = currentNode.varname;
    
    if (!(results.response && varname)) 
			return next();

    if (currentNode.data.validation && currentNode.data.validation.type)
    {
      // Perform validations
      var invalidMsg = currentNode.data.validation.setup.invalid_msg ? currentNode.data.validation.setup.invalid_msg : 'Invalid value';
      var isValid = Validator.validate(currentNode.data.validation.type, results.response, currentNode.data.validation.setup);
      if (!isValid)
      {
        session.send(invalidMsg);
        this.validateCurrentNode = true;
        return next();
      }
    }

    let value: any = null;
    switch (currentNode.type) {
      case NodeType.prompt:
			
				// TODO switch to enum
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
  }

  /**
   * Evaluates and moves to the next node in the graph
   * 
   * @private
   * @param {builder.Session} session
   * @param {any} args
   * @param {any} next
   * @returns {*}
   * 
   * @memberOf GraphDialog
   */
  private setNextStepHandler(session: builder.Session, args, next): any {

    let nextNode: INode = null;
    if (this.validateCurrentNode) {
      nextNode = this.nav.getCurrentNode(session);
      this.validateCurrentNode = false;
    } else {
      nextNode = this.nav.getNextNode(session);
    }

    if (nextNode) {
      console.log(`step handler node: ${nextNode.id}`);
    }
    else {
				console.log('ending dialog');
				return session.endConversation();
			}

    return next();
  }
}