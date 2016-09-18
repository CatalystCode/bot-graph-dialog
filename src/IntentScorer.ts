
import common = require('./common');
import Luis = require('./LuisModel');
var request = require('request-promise');
var _ = require('underscore');
var Promise = require('promise');

export interface IIntentScorer {
  collectIntents(models: Luis.ILuisModel[], text: string, threashold: number): Promise<Luis.IIntentScore[]>;
}


export class IntentScorer implements IIntentScorer {

	 public collectIntents(models: Luis.ILuisModel[], text: string, threashold: number = 0): Promise<Luis.IIntentScore[]> {
		 	let self = this;
			return new Promise(function (resolve, reject) {
				if (!models) return reject('Please provide models array');
				if (!text) return reject('Please provide text');

				let promises: Promise<any>[] = models.map(model => {
					return self.scoreIntent(model, text, threashold);
				})
			
				Promise.all(promises)
					.then(intents => {
						var sortedIntents = _.sortBy(_.compact(intents), 'score').reverse();
						sortedIntents = _.filter(sortedIntents, intent => intent.intent != 'None');
						resolve(sortedIntents);
					})
					.catch(reject);
			});  
	 }

	 private scoreIntent(model: Luis.ILuisModel, text: string, threashold: number = 0): Promise<Luis.IIntentScore> {
		 return new Promise(function (resolve, reject) {
			 return request(model.url + encodeURIComponent(text))
				.then(result => {
					let json = JSON.parse(result);
					if (!json || !json.intents || !json.intents.length) return resolve();

					// In case when minumum score is required, enforce minimum score
					if (json.intents[0].score < threashold) return resolve();

					let intent = json.intents[0];
					intent.model = model.name;

					return resolve(<Luis.IIntentScore>intent);
				})
				.catch(reject);
		});
		}

}

