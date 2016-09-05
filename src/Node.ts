
export interface INode {
    id: string;
    childs?: INode[];
}

export class Node implements INode {

	private tree: any[];

	public id: string;
	public childs: INode[];
}
