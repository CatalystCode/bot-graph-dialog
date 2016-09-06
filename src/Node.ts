
import common = require('./common');

export enum NodeType {
	sequence
}

export interface INode {
    id: string;
		type: NodeType;
		body: any,
		parent?: INode,
		prev?: INode,
		next?: INode
}

export class Node implements INode {

	private tree: any[];

	public id: string;
	public type: NodeType;
	public body: any;

	constructor(node: INode) {
		
		this.id = node.id;
		this.type = node.type;
		delete node.id;
		delete node.type;

		this.body = node;
	}
}
