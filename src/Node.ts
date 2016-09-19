import { List } from './Common';
import interfaces = require('./Interfaces');

export class Node implements interfaces.INode {

	private tree: any[];

	public id: string;
	public varname: string;
	public type: interfaces.NodeType;
	public body: any;
	public data: any;
	public steps: List<interfaces.INode>;
	public scenarios: List<interfaces.IScenario>;
	public parent: interfaces.INode;
	public prev: interfaces.INode;
	public next: interfaces.INode;

	constructor(node: interfaces.INode, type: string | interfaces.NodeType) {
		
		this.id = node.id;
		if (typeof type === 'string')
			this.type = interfaces.NodeType[type];
		else
			this.type = <interfaces.NodeType>type;

		/*
		delete node.id;
		delete node.type;
*/

		this.varname = node.varname || this.id;
		this.steps = new List<interfaces.INode>();
		this.scenarios = new List<interfaces.IScenario>();

		this.body = node;
		this.data = node.data;
	}
}
