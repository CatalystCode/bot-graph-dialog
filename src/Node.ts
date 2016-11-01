import { List } from './Common';
import { IScenario, Scenario } from './Scenario';

// Types of nodes definable by the 
export enum NodeType {
	text,
	prompt,
	score,
	handler,
	sequence,
	end
}

export interface INode {
		//constructor(node: Node, type: string | NodeType);
    id: string;
		varname?: string;
		type: NodeType;
		typeName: string;
		body: any,
		data: any,
		parent?: INode,
		prev?: INode,
		next?: INode,
		steps?: List<INode>,
		scenarios?: List<IScenario>
}


export class Node implements INode {

	private tree: any[];

	public id: string;
	public varname: string;
	public type: NodeType;
	public typeName: string;
	public body: any;
	public data: any;
	public steps: List<INode>;
	public scenarios: List<IScenario>;
	public parent: INode;
	public prev: INode;
	public next: INode;

	constructor(node: INode, type: string | NodeType) {
		
		this.id = node.id;
		if (typeof type === 'string') {
			this.type = NodeType[type];
			this.typeName = type;
		}
		else
			this.type = <NodeType>type;

		this.varname = node.varname || this.id;
		this.steps = new List<INode>();
		this.scenarios = new List<IScenario>();

		this.body = node;
		this.data = node.data;
	}
}
