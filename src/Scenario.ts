
import { List } from './Common';
import n = require('./Node');

export interface IScenario {
    condition: string;
		steps?: List<n.INode>;
		node: n.INode;
}

export class Scenario implements IScenario {

	public condition: string;	
	public steps: List<n.INode>;
	public node: n.INode;

	constructor(condition: string, node: n.INode = null) {
		this.condition = condition;
		this.node = node;
		this.steps = new List<n.INode>()
	}
}
