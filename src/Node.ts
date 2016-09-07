
import common = require('./common');
import scenarioAPI = require('./Scenario');

export enum NodeType {
	sequence
}

export interface INode {
    id: string;
		type: NodeType;
		body: any,
		parent?: INode,
		prev?: INode,
		next?: INode,
		steps?: common.List<INode>,
		scenarios?: common.List<scenarioAPI.IScenario>
}

export class Node implements INode {

	private tree: any[];

	public id: string;
	public type: NodeType;
	public body: any;
	public steps: common.List<INode>;
	public scenarios: common.List<scenarioAPI.IScenario>;
	public parent: INode;
	public prev: INode;
	public next: INode;

	constructor(node: INode) {
		
		this.id = node.id;
		this.type = node.type;
		
		/*
		delete node.id;
		delete node.type;
*/

		this.steps = new common.List<INode>();
		this.scenarios = new common.List<scenarioAPI.IScenario>();

		this.body = node;
	}
}
