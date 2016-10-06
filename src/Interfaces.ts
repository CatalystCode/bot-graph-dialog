
import common = require('./common');

export enum NodeType {
	text,
	prompt,
	score,
	handler,
	sequence,
	end
}

export interface INode {
		//constructor(node: Node, type: string | NodeType);
    id: string;
		varname?: string;
		type: NodeType;
		body: any,
		data: any,
		parent?: INode,
		prev?: INode,
		next?: INode,
		steps?: common.List<INode>,
		scenarios?: common.List<IScenario>
}

export interface IScenario {
    condition: string;
		steps?: common.List<INode>;
		node: INode;
}

export interface IParserOptions {
	scenario?: string;
	loadScenario?(name: string): Promise<any>;
	loadHandler?(name: string): Promise<string>;
} 

export interface INavigatorOptions extends IParserOptions {
	
} 

export interface IGraphDialogOptions extends INavigatorOptions { 
	steps?: number;
}

export interface IIntentScorer {
  collectIntents(models: ILuisModel[], text: string, threashold: number): Promise<IIntentScore[]>;
}


export interface ILuisModel {
    name: string;
		url: string;
}


export interface IIntentScore {
	name: string;
	model: string;
	score: number;
}


export interface IHandler {
    handle: () => void
}