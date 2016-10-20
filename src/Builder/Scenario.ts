
import { List } from './Common';
import { INode } from './Node';
import interfaces = require('./Interfaces');

export interface IScenario {
		condition() : string;
  	condition(name: string) : IScenario;

		node() : INode;
  	node(node: INode) : IScenario;

		steps() : List<INode>;
		steps(steps: List<INode>) : IScenario;
}

export class Scenario implements IScenario {

	private _condition: string;	
	private _steps: List<INode>;
	private _node: INode;

	constructor(condition: string, node: INode = null) {
		this._condition = condition;
		this._node = node;
		this._steps = new List<INode>()
	}

	condition(condition?: string) : any {
    if (typeof condition === 'string') {
      this._condition = condition;
      return this;
    }
    return this._condition;
  }

	node(node?: INode) : any {
    if (typeof node === 'INode') {
      this._node = node;
      return this;
    }
    return this._node;
  }

	steps(steps?: List<INode>) : any {
    if (typeof steps === 'List<INode>') {
      this._steps = steps;
      return this;
    }
    return this._steps;
  }
}
