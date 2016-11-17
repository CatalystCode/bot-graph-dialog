import { List } from './Common';
import { IScenario, Scenario } from './Scenario';

/**
 * Types of nodes currently supported natively 
 * 
 * @export
 * @enum {number}
 */
export enum NodeType {
	/**
	 * a text node
	 */
	text,
	/**
	 * a prompt node
	 */
	prompt,
	/**
	 * a score node
	 */
	score,
	/**
	 * a custom handler node
	 */
	handler,
	/**
	 * a sequence node
	 */
	sequence,
	/**
	 * an end-the-conversation node
	 */
	end,
	/**
	 * a hero card
	 */
	heroCard,
	/**
	 * a carousel (collection of hero cards)
	 */
	carousel
}

/**
 * Interface for a node in the graph
 * 
 * @export
 * @interface INode
 */
export interface INode {
		//constructor(node: Node, type: string | NodeType);
		/**
		 * Id
		 *
		 * @type {string}
		 * @memberOf INode
		 */
		id: string;
		/**
		 * The variable name that will be used to save the user input for this node
		 * 
		 * @type {string}
		 * @memberOf INode
		 */
		varname?: string;
		/**
		 * The node Type
		 * 
		 * @type {NodeType}
		 * @memberOf INode
		 */
		type: NodeType;
		/**
		 * The node type name
		 * 
		 * @type {string}
		 * @memberOf INode
		 */
		typeName: string;
		/**
		 * The node's body- the original json object
		 * 
		 * @type {*}
		 * @memberOf INode
		 */
		body: any,
		/**
		 * The node's data object
		 * 
		 * @type {*}
		 * @memberOf INode
		 */
		data: any,
		/**
		 * The node's parent
		 * 
		 * @type {INode}
		 * @memberOf INode
		 */
		parent?: INode,
		/**
		 * The previous node
		 * 
		 * @type {INode}
		 * @memberOf INode
		 */
		prev?: INode,
		/**
		 * The next node
		 * 
		 * @type {INode}
		 * @memberOf INode
		 */
		next?: INode,
		/**
		 * Child nodes in case of a 'steps' node type
		 * 
		 * @type {List<INode>}
		 * @memberOf INode
		 */
		steps?: List<INode>,
		/**
		 * Scenarios nodes in case of a condition node
		 * 
		 * @type {List<IScenario>}
		 * @memberOf INode
		 */
		scenarios?: List<IScenario>
}


/**
 * The Node class representing a node in the dialog graph
 * 
 * @export
 * @class Node
 * @implements {INode}
 */
export class Node implements INode {

	/**
	 * The tree- the head node of this dialog
	 * 
	 * @private
	 * @type {any[]}
	 * @memberOf Node
	 */
	private tree: any[];

	/**
	 * 
	 * 
	 * @type {string}
	 * @memberOf Node
	 */
	public id: string;
	/**
	 * 
	 * 
	 * @type {string}
	 * @memberOf Node
	 */
	public varname: string;
	/**
	 * 
	 * 
	 * @type {NodeType}
	 * @memberOf Node
	 */
	public type: NodeType;
	/**
	 * 
	 * 
	 * @type {string}
	 * @memberOf Node
	 */
	public typeName: string;
	/**
	 * 
	 * 
	 * @type {*}
	 * @memberOf Node
	 */
	public body: any;
	/**
	 * 
	 * 
	 * @type {*}
	 * @memberOf Node
	 */
	public data: any;
	/**
	 * 
	 * 
	 * @type {List<INode>}
	 * @memberOf Node
	 */
	public steps: List<INode>;
	/**
	 * 
	 * 
	 * @type {List<IScenario>}
	 * @memberOf Node
	 */
	public scenarios: List<IScenario>;
	/**
	 * 
	 * 
	 * @type {INode}
	 * @memberOf Node
	 */
	public parent: INode;
	/**
	 * 
	 * 
	 * @type {INode}
	 * @memberOf Node
	 */
	public prev: INode;
	/**
	 * 
	 * 
	 * @type {INode}
	 * @memberOf Node
	 */
	public next: INode;

	/**
	 * Creates an instance of Node.
	 * 
	 * @param {INode} node
	 * @param {(string | NodeType)} type
	 * 
	 * @memberOf Node
	 */
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
