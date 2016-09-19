
import { Parser } from './Parser';
import { Navigator } from './Navigator';
import { IntentScorer } from './IntentScorer';
import interfaces = require('./Interfaces');
import builder = require('botbuilder');
import path = require('path');

var strformat = require('strformat');


let NodeType = interfaces.NodeType;

export class GraphDialog {

	private nav: Navigator;
  private intentScorer: interfaces.IIntentScorer;
	

	constructor(private options: interfaces.IGraphDialogOptions = {}) {
		if (typeof this.options.steps !== 'number') {
      this.options.steps = 100;
    }
    
    let parser = new Parser(options.parser);
    this.nav = new Navigator(parser);
    this.intentScorer = new IntentScorer();
	}


/*
	// TODO cancel using the c'tor
	public static fromJson(filePath: string, options: IGraphDialogOptions) {
		// require file
		var json = {};//
		return new GraphDialog(options);
	}
*/
	public getSteps(): any[] {
		console.log('get steps');

		var steps = [];

	/*
		// temporary- clear session every time we start
		function clearSession(session, results, next) {
			if (session.dialogData._currentNodeId) { 
				console.info('clearing session');
				session.reset();
			}
			return next();
		}
	
		steps.push(clearSession);
	*/

		for (var i=0; i<this.options.steps; i++) {
			steps.push((session: builder.Session, results, next) => this.stepInteractionHandler(session, results, next));
      steps.push((session: builder.Session, results, next) => this.stepResultCollectionHandler(session, results, next));
      steps.push((session: builder.Session, results, next) => this.setNextStepHandler(session, results, next));
		}

		return steps;
	}


  // TODO: add option for 'bot is typeing' message before sending the answer
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
        var botModels = currentNode.data.models.map(model => this.nav.models.get(model));
        
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
        var handlerPath = path.join(this.options.parser.handlersPath, handlerName)
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
  }

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
