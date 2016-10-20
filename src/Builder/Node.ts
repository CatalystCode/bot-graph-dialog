import { List, setIf } from './Common';

import s = require('./Scenario');
import { Builder } from './Builder';

export const NodeTypes = {
	text: 'text',
	prompt: 'prompt',
	score: 'score',
	handler: 'handler',
	sequence: 'sequence',
	end: 'end'
}


export interface INode {
		//constructor(node: Node, type: string | NodeType);
    
		varname(varname?: string): INode | string;
	
		body: any,
		data: any,
		parent?: INode,
		prev(prev?: INode): INode,
		next(next?: INode): INode,

		steps?: List<INode>,
		scenarios?: List<s.IScenario>,
		type() : string
		id(id?: string): string
}


export abstract class Node implements INode {

	private tree: any[];

	private static idCount = 1;

	private _id: string;
	private _varname: string;
	private _type: string;
	public body: any;
	public data: any;
	public steps: List<INode>;
	public scenarios: List<s.IScenario>;
	public parent: INode;

	protected _next: INode;
	protected _prev: INode;

	protected _builder: Builder;

 	constructor(builder: Builder, type: string, id? : string) {

		 if (!(builder instanceof Builder)) {
			 throw new Error('Builder was not provided');
		 }
		 this._builder = builder;

		// TODO: check instance type
		if (typeof type !== 'string') {
			throw new Error('Please provide node type');	
		}

		this._type = type;

		if (typeof id === 'string') {
			this._id = id;
		}
		else {
			this._id = (typeof this) + '_' + (Node.idCount ++);
		}
		console.log(`Node id ${this._id} of type ${typeof this} instantiated`);


		/*
		this.id = node.id;
		if (typeof type === 'string')
			this.type = NodeType[type];
		else
			this.type = <NodeType>type;

	

		this.varname = node.varname || this.id;
		this.steps = new List<INode>();
		this.scenarios = new List<s.IScenario>();

		this.body = node;
		this.data = node.data;
		*/
	}
	public id(): string {
		return this._id;
	}

	public type() : string {
		return this._type;
	}

	public next(next?: INode): INode {
		if (next) {
			this._next = next;
			return this;
		}
		return this._next;
	}
	
	public prev(prev?: INode): INode {
		if (prev) {
			this._prev = prev;
			return this;
		}
		return this._prev;
	}

	public end(): Builder {
		return this._builder;
	}

	public varname(varname?: string): INode | string {
		if (typeof varname === 'string') {
			this._varname = varname;
			return this;
		}
		return this._varname;
	}
}

export interface ITextNodeOptions {
	id?: string;
	text?: string;
}

export class TextNode extends Node {
	
	private _text: string = ''
	
	constructor(builder: Builder, private options: ITextNodeOptions = {}) {
		super(builder, NodeTypes.text, options.id);
		this.text(options.text);
	}

	public text(text: string = null) : TextNode | string {
		if (text != null) {
			this._text = text;
			return this as TextNode;
		}
		return this._text;
	}

}

export class PromptNode extends Node {
	
	private _text: string = ''
	
	constructor(builder: Builder, private options: ITextNodeOptions = {}) {
		super(builder, NodeTypes.prompt, options.id);
		this.text(options.text);
	}

	public text(text?: string) : PromptNode | string {
		if (typeof text === 'string') {
			this._text = text;
			return this;
		}

		return this._text;
	}


}

export class ScoreNode extends Node {
	
	constructor(builder: Builder, private options: ITextNodeOptions = {}) {
		super(builder, NodeTypes.score, options.id);
		this.data = {
			models: []
		};
	}

	public models(models: string | string[]) : any { return setIf<ScoreNode, string[]>(this, 'data._models', typeof models === 'string' ? [ models ] : models);	}
}