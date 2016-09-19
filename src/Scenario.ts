
import { List } from './Common';
import interfaces = require('./Interfaces');

export class Scenario implements interfaces.IScenario {

	public condition: string;	
	public steps: List<interfaces.INode>;
	public node: interfaces.INode;

	constructor(condition: string, node: interfaces.INode = null) {
		this.condition = condition;
		this.node = node;
		this.steps = new List<interfaces.INode>()
	}
}
