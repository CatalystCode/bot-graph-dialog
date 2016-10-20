import {IDialog} from './Dialog';

import { List, setIf } from './Common';
import { INode } from './Node';
import { IModel } from './Model';
import interfaces = require('./Interfaces');

export enum DialogType {
  sequence
}

export interface IDialog {

    id() : string;
    id(id: string) : IDialog;

    type() : DialogType;
    type(type: DialogType) : IDialog;

		steps() : List<INode>;
		steps(steps: INode[]) : IDialog;

		models() : List<IModel>;
  	models(models: IModel[]) : IDialog;
}

export class Dialog implements IDialog {

	private _id: string = null;
	private _type: string = null;
	private _steps: INode[] = [];
	private _models: IModel[] = [];

	constructor(id: string) {
		this.id(id);
	}

	id(id?: string) : any { return setIf<Dialog, string>(this, '_id', id); } 
	type(type?: DialogType) : any { return setIf<Dialog, DialogType>(this, '_type', type); } 

	steps(steps?: INode[]) : any { return setIf<Dialog,  INode[]>(this, '_steps', steps); } 
	models(models?: IModel[]) : any { return setIf<Dialog,  IModel[]>(this, '_models', models); } 
}
