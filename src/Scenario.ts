
import common = require('./common');
import node = require('./Node');


export interface IScenario {
    condition: string;
		steps?: common.List<node.INode>;
		node: node.INode;
}

export class Scenario implements IScenario {

	public condition: string;	
	public steps: common.List<node.INode>;
	public node: node.INode;

	constructor(condition: string, node: node.INode = null) {
		this.condition = condition;
		this.node = node;
		this.steps = new common.List<node.INode>()
	}
}
