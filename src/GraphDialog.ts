
import { Parser } from './Parser';
import nav = require('./Navigator');
import n = require('./Node');
import i = require('./IntentScorer');
import a = require('./Action');
import { Map, List } from './Common';
import builder = require('botbuilder');
import path = require('path');

var extend = require('extend');
var strformat = require('strformat');
var uuid = require('uuid');

let NodeType = n.NodeType;

export interface IGraphDialogOptions extends nav.INavigatorOptions { 
	bot?: builder.UniversalBot;
  customTypeHandlers?: a.ICustomNodeTypeHandler[]
}

export interface IHandler {
    (session: builder.Session, results, next): void
}

interface IStepFunction {
  (session: builder.Session, results, next): void;
}

export interface IGraphDialog {
    init(): Promise<IGraphDialog>;
    getDialog(): IStepFunction;
    //static fromScenario(options: IGraphDialogOptions): Promise<IGraphDialog>
}


export class GraphDialog implements IGraphDialog {

	private nav: nav.Navigator;
  private navKey: string;
  private navMap: Map<nav.Navigator> = new Map<nav.Navigator>();

  private intentScorer: i.IIntentScorer;
	private done: () => any;
  private customTypeHandlers: Map<a.ICustomNodeTypeHandler>;

  private loopDialogName: string = '__internalLoop';

	constructor(private options: IGraphDialogOptions = {}) {
		if (!options.bot) throw new Error('please provide the bot object');

    this.loopDialogName += options.scenario + uuid.v4();
    this.setBotDialog();
    
    this.intentScorer = new i.IntentScorer();

    options.customTypeHandlers = options.customTypeHandlers || new Array<a.ICustomNodeTypeHandler>();
    this.customTypeHandlers = new Map<a.CustomNodeTypeHandler>();
    for (let i=0; i<options.customTypeHandlers.length; i++) {
      let handler = <a.ICustomNodeTypeHandler>options.customTypeHandlers[i];
      this.customTypeHandlers.add(handler.name, handler);
    }
	}

  public init(): Promise<IGraphDialog> {
    return new Promise<IGraphDialog>((resolve, reject) => {
      let parser = new Parser(this.options);
      parser.init().then(() => {
        console.log('parser is ready');
        this.nav = new nav.Navigator(parser);
        this.navKey = uuid.v4();
        this.navMap.add(this.navKey, this.nav);
        return resolve(this);
      }).catch(e => reject(e));
    });
  }

  public reload(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      return this.init()
        .then(() => resolve())
        .catch(err => reject(err));
    });
  }

	public static fromScenario(options: IGraphDialogOptions = {}): Promise<IGraphDialog> {
		let gd = new GraphDialog(options);
    return gd.init();
	}

	public getDialog(): IStepFunction {
		console.log('get dialog');
    return (session: builder.Session, results, next) => {
        console.log('calling loop function for the first time');
        
        // assign the navigator Id for the user
        session.dialogData._navId = this.navKey;
        session.replaceDialog('/' + this.loopDialogName);
    };
	}

  private getNavigator(session: builder.Session): nav.Navigator {
    var navId = session.dialogData._navId;
    if (navId && this.navMap.has(navId))
      return this.navMap.get(navId);
    return this.nav;
  }

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

  // TODO: add option for 'bot is typeing' message before sending the answer
  private stepInteractionHandler(session: builder.Session, results, next): void {
    session.dialogData._lastMessage = session.message && session.message.text;
    let currentNode = this.getNavigator(session).getCurrentNode(session);
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
        var botModels = currentNode.data.models.map(model => this.getNavigator(session).models.get(model));
        
        var text = session.dialogData[currentNode.data.source] || session.dialogData._lastMessage;
        console.log(`LUIS scoring for node: ${currentNode.id}, text: \'${text}\' LUIS models: ${botModels}`);

        this.intentScorer.collectIntents(botModels, text, currentNode.data.threashold)
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
        let handler: IHandler = <IHandler>this.getNavigator(session).handlers.get(handlerName);
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

        let customHandler: a.ICustomNodeTypeHandler = this.customTypeHandlers.get(currentNode.typeName);
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

  private stepResultCollectionHandler(session: builder.Session, results, next) {
    let currentNode = this.getNavigator(session).getCurrentNode(session);
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

  private setNextStepHandler(session: builder.Session, args, next): any {
    let nextNode = this.getNavigator(session).getNextNode(session);

    if (nextNode) {
      console.log(`step handler node: ${nextNode.id}`);

      // workaround to go back to the first step of processing the next node
      //session.dialogData['BotBuilder.Data.WaterfallStep'] = 0;
    }
    else {
				console.log('ending dialog');
				session.endDialog();
				return;
			}

    return next();
  }
}
