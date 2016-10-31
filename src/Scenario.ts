
import { List } from './Common';
import { INode } from './Node';

export interface IScenario {
    condition: string;
		steps?: List<INode>;
		node: INode;
}

export class Scenario implements IScenario {

	public condition: string;	
	public steps: List<INode>;
	public node: INode;

	constructor(condition: string, node: INode = null) {
		this.condition = condition;
		this.node = node;
		this.steps = new List<INode>()
	}
}
