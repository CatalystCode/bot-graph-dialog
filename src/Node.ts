
import common = require('./common');
import scenarioAPI = require('./Scenario');

export enum NodeType {
	text,
	prompt,
	score,
	handler,
	sequence,
	end
}

export interface INode {
    id: string;
		varname?: string;
		type: NodeType;
		body: any,
		data: any,
		parent?: INode,
		prev?: INode,
		next?: INode,
		steps?: common.List<INode>,
		scenarios?: common.List<scenarioAPI.IScenario>
}

export class Node implements INode {

	private tree: any[];

	public id: string;
	public varname: string;
	public type: NodeType;
	public body: any;
	public data: any;
	public steps: common.List<INode>;
	public scenarios: common.List<scenarioAPI.IScenario>;
	public parent: INode;
	public prev: INode;
	public next: INode;

	constructor(node: INode, type: string | NodeType) {
		
		this.id = node.id;
		if (typeof type === 'string')
			this.type = NodeType[type];
		else
			this.type = <NodeType>type;

		/*
		delete node.id;
		delete node.type;
*/

		this.varname = node.varname || this.id;
		this.steps = new common.List<INode>();
		this.scenarios = new common.List<scenarioAPI.IScenario>();

		this.body = node;
		this.data = node.data;
	}
}
