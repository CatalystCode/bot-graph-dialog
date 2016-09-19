
import interfaces = require('./Interfaces');

export class LuisModel implements interfaces.ILuisModel {
	constructor(public name: string, public url: string) {
	}
}

export class IntentScore implements interfaces.IIntentScore {
	constructor(public name: string, public model: string, public score: number) {
	}
}
