import * as builder from 'botbuilder';

export interface IExecute {
    (session: builder.Session, next, data): void
}

export interface ICustomNodeTypeHandler {
	name: string,
	execute: IExecute
}

export class CustomNodeTypeHandler implements ICustomNodeTypeHandler {
		
	constructor(public name: string, public execute: IExecute) {

	}

}