
import { Parser } from './Parser';
import { INavigatorOptions, Navigator } from './Navigator';
import { NodeType } from './Node';
import { IIntentScorer, IntentScorer } from './IntentScorer';
import { ICustomNodeTypeHandler, CustomNodeTypeHandler } from './Action';
import { Map, List } from './Common';
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
  customTypeHandlers?: ICustomNodeTypeHandler[]
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
   * Unique private key used to bind this dialog on the bot object
   * 
   * @private
   * @type {string}
   * @memberOf GraphDialog
   */
  private loopDialogName: string = '__internalLoop';

	/**
	 * Creates an instance of GraphDialog.
	 * 
	 * @param {IGraphDialogOptions} [options={}]
	 * 
	 * @memberOf GraphDialog
	 */
	constructor(private options: IGraphDialogOptions = {}) {
		
    if (!options.bot) throw new Error('please provide the bot object');
    
    this.loopDialogName += options.scenario + uuid.v4();
    this.setBotDialog();
    
    this.intentScorer = new IntentScorer();

    // Initialize custom handlers
    options.customTypeHandlers = options.customTypeHandlers || new Array<ICustomNodeTypeHandler>();
    this.customTypeHandlers = new Map<CustomNodeTypeHandler>();
    for (let i=0; i < options.customTypeHandlers.length; i++) {
      let handler = <ICustomNodeTypeHandler>options.customTypeHandlers[i];
      this.customTypeHandlers.add(handler.name, handler);
    }
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
      let parser = new Parser(this.options);
      parser.init().then(() => {
        console.log('parser is ready');
        this.nav = new Navigator(parser);
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
        session.replaceDialog('/' + this.loopDialogName);
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

    this.options.bot.dialog('/' + this.loopDialogName, [
      (session, results, next) => { 
          if (results && results._dialogDataFlag) {
            // restore dialogData state from previous last step
            let obj:any = {};
            extend(true, obj, results);
            delete obj._dialogDataFlag;
            delete obj['BotBuilder.Data.WaterfallStep'];
            extend(true, session.dialogData, obj);                    
        }
        return this.stepInteractionHandler(session, results, next); 
      },
      (session, results, next) => { 
        return this.stepResultCollectionHandler(session, results, next); 
      },
      (session, results, next) => { 
        return this.setNextStepHandler(session, results, next); 
      },
      (session, results, next) => {
        console.log('calling loop function');
        session.dialogData._dialogDataFlag = true;
        session.replaceDialog('/' + this.loopDialogName, session.dialogData);
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
    session.dialogData._lastMessage = session.message && session.message.text;
    let currentNode = this.nav.getCurrentNode(session);
    console.log(`perform action: ${currentNode.id}, ${currentNode.type}`);

    switch (currentNode.type) {

      case NodeType.text:
        var text = strformat(currentNode.data.text, session.dialogData);
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
        
        var score_text = session.dialogData[currentNode.data.source] || session.dialogData._lastMessage;
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
        session.endDialog();
        break;

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

    switch (currentNode.type) {
      case NodeType.prompt:
			
				// TODO switch to enum
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
    let nextNode = this.nav.getNextNode(session);

    if (nextNode) {
      console.log(`step handler node: ${nextNode.id}`);
    }
    else {
				console.log('ending dialog');
				session.endDialog();
				return;
			}

    return next();
  }
}
