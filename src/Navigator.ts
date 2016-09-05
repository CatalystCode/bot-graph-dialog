import node = require('./Node');
import graph = require('./GraphDialog');


export interface INavigatorOptions {
	graph: any;
	scenariosPath?: string;
	handlersPath?: string;
} 

export class Navigator {

	private root: node.INode;

	constructor(private options: INavigatorOptions) {
		this.initGraphNodes(options.graph);
	}

	public getSteps(): any[] {
			console.log('get steps');
			return [];
	}

	private initGraphNodes(graph: any[]) {

	}

}
