
import common = require('./common');
import interfaces = require('./Interfaces');

export class Scenario implements interfaces.IScenario {

	public condition: string;	
	public steps: common.List<interfaces.INode>;
	public node: interfaces.INode;

	constructor(condition: string, node: interfaces.INode = null) {
		this.condition = condition;
		this.node = node;
		this.steps = new common.List<interfaces.INode>()
	}
}
