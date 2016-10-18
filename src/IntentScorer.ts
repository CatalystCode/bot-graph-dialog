

import l = require('./Luis');
var request = require('request-promise');
var Promise = require('promise');
var _ = require('underscore');

export interface IIntentScorer {
  collectIntents(models: l.ILuisModel[], text: string, threashold: number): Promise<l.IIntentScore[]>;
}

export class IntentScorer implements IIntentScorer {

	 public collectIntents(models: l.ILuisModel[], text: string, threashold: number = 0): Promise<l.IIntentScore[]> {

			let promises: Promise<any>[] = models.map(model => {
				return this.scoreIntent(model, text, threashold);
			});

			return new Promise(function (resolve, reject) {
				if (!models) return reject('Please provide models array');
				if (!text) return reject('Please provide text');

				Promise.all(promises)
					.then(intents => {
						var sortedIntents = _.sortBy(_.compact(intents), 'score').reverse();
						sortedIntents = _.filter(sortedIntents, intent => intent.intent != 'None');
						resolve(sortedIntents);
					})
					.catch(reject);
			});  
	 }

	 private scoreIntent(model: l.ILuisModel, text: string, threashold: number = 0): Promise<l.IIntentScore> {
		 return new Promise(function (resolve, reject) {
			 return request(model.url + encodeURIComponent(text))
				.then(result => {
					let json = JSON.parse(result);
					if (!json || !json.intents || !json.intents.length) return resolve();

					// In case when minumum score is required, enforce minimum score
					if (json.intents[0].score < threashold) return resolve();

					let intent = json.intents[0];
					intent.model = model.name;

					return resolve(<l.IIntentScore>intent);
				})
				.catch(reject);
		});
		}

}

