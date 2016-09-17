
import common = require('./common');


export interface ILuisModel {
    name: string;
		url: string;
}

export class LuisModel implements ILuisModel {

	constructor(public name: string, public url: string) {
		
	}
}
