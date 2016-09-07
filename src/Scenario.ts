
import common = require('./common');
import node = require('./Node');


export interface IScenario {
    condition: string;
		steps?: common.List<node.INode>
}

export class Scenario implements IScenario {

	public condition: string;	
	public steps: common.List<node.INode>;


	constructor(condition: string) {
		this.condition = condition;
		this.steps = new common.List<node.INode>()
	}
}
