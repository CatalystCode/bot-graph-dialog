
/**
 * Interface for a Luis model
 * 
 * @export
 * @interface ILuisModel
 */
export interface ILuisModel {
    /**
     * name of the model
     * 
     * @type {string}
     * @memberOf ILuisModel
     */
    name: string;
		/**
		 * Url for the model
		 * 
		 * @type {string}
		 * @memberOf ILuisModel
		 */
		url: string;
}

/**
 * Interface for an intent score
 * 
 * @export
 * @interface IIntentScore
 */
export interface IIntentScore {
	/**
	 * model name
	 * 
	 * @type {string}
	 * @memberOf IIntentScore
	 */
	name: string;
	/**
	 * model 
	 * 
	 * @type {string}
	 * @memberOf IIntentScore
	 */
	model: string;
	/**
	 * the score
	 * 
	 * @type {number}
	 * @memberOf IIntentScore
	 */
	score: number;
}

/**
 * Wrapper class for a LuisModel details
 * 
 * @export
 * @class LuisModel
 * @implements {ILuisModel}
 */
export class LuisModel implements ILuisModel {
	/**
	 * Creates an instance of LuisModel.
	 * 
	 * @param {string} name
	 * @param {string} url
	 * 
	 * @memberOf LuisModel
	 */
	constructor(public name: string, public url: string) {
	}
}

/**
 * Wrapper class for an intent score
 * 
 * @export
 * @class IntentScore
 * @implements {IIntentScore}
 */
export class IntentScore implements IIntentScore {
	/**
	 * Creates an instance of IntentScore.
	 * 
	 * @param {string} name
	 * @param {string} model
	 * @param {number} score
	 * 
	 * @memberOf IntentScore
	 */
	constructor(public name: string, public model: string, public score: number) {
	}
}
