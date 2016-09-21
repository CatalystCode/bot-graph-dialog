import { List } from './Common';

import s = require('./Scenario');
import { Builder } from './Builder';

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
	
		body: any,
		data: any,
		parent?: INode,
		prev(prev?: INode): INode,
		next(next?: INode): INode,

		steps?: List<INode>,
		scenarios?: List<s.IScenario>,
		type() : NodeType
}


export abstract class Node implements INode {

	private tree: any[];

	private static idCount = 1;

	public id: string;
	public varname: string;
	private _type: NodeType;
	public body: any;
	public data: any;
	public steps: List<INode>;
	public scenarios: List<s.IScenario>;
	public parent: INode;

	protected _next: INode;
	protected _prev: INode;

	protected _builder: Builder;

 	constructor(builder: Builder, type: NodeType, id? : string) {
		
		 if (!(builder instanceof Builder)) {
			 throw new Error('Builder was not provided');
		 }
		 this._builder = builder;

		// TODO: check instance type
		if (typeof type !== 'number') {
			throw new Error('Please provide node type');	
		}

		this._type = type;

		if (typeof id === 'string') {
			this.id = id;
		}
		else {
			this.id = (typeof this) + '_' + (Node.idCount ++);
		}
		console.log(`Node id ${this.id} of type ${typeof this} instantiated`);


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

	public type() : NodeType {
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
}

export interface ITextNodeOptions {
	id?: string;
	text?: string;
}

export class TextNode extends Node {
	
	private _text: string = ''
	
	constructor(builder: Builder, private options: ITextNodeOptions = {}) {
		super(builder, NodeType.text, options.id);
		this.text(options.text);
	}

	public text(text?: string) : TextNode | string {
		if (typeof text === 'string') {
			this._text = text;
			return this;
		}

		return this._text;
	}


}
