
import { List } from './Common';
import { INode } from './Node';

/**
 * An interface for a scenario
 * 
 * @export
 * @interface IScenario
 */
export interface IScenario {
    /**
     * The condition for this scenario
     * 
     * @type {string}
     * @memberOf IScenario
     */
    condition: string;
		/**
		 * List of steps
		 * 
		 * @type {List<INode>}
		 * @memberOf IScenario
		 */
		steps?: List<INode>;
		/**
		 * A node to jump to if a condition is met
		 * 
		 * @type {INode}
		 * @memberOf IScenario
		 */
		node: INode;
}

/**
 * A scenario class
 * 
 * @export
 * @class Scenario
 * @implements {IScenario}
 */
export class Scenario implements IScenario {

	/**
	 * 
	 * 
	 * @type {string}
	 * @memberOf Scenario
	 */
	public condition: string;	
	/**
	 * 
	 * 
	 * @type {List<INode>}
	 * @memberOf Scenario
	 */
	public steps: List<INode>;
	/**
	 * 
	 * 
	 * @type {INode}
	 * @memberOf Scenario
	 */
	public node: INode;

	/**
	 * Creates an instance of Scenario.
	 * 
	 * @param {string} condition
	 * @param {INode} [node=null]
	 * 
	 * @memberOf Scenario
	 */
	constructor(condition: string, node: INode = null) {
		this.condition = condition;
		this.node = node;
		this.steps = new List<INode>()
	}
}
