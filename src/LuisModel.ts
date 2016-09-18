
import common = require('./common');


export interface ILuisModel {
    name: string;
		url: string;
}


export interface IIntentScore {
	name: string;
	model: string;
	score: number;
}


export class LuisModel implements ILuisModel {

	constructor(public name: string, public url: string) {
		
	}
}


export class IntentScore implements IIntentScore {

	constructor(public name: string, public model: string, public score: number) {
		
	}
}
