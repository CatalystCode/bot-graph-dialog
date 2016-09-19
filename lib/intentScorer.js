"use strict";
var request = require('request-promise');
var Promise = require('promise');
var _ = require('underscore');
var IntentScorer = (function () {
    function IntentScorer() {
    }
    IntentScorer.prototype.collectIntents = function (models, text, threashold) {
        if (threashold === void 0) { threashold = 0; }
        var self = this;
        return new Promise(function (resolve, reject) {
            if (!models)
                return reject('Please provide models array');
            if (!text)
                return reject('Please provide text');
            var promises = models.map(function (model) {
                return self.scoreIntent(model, text, threashold);
            });
            Promise.all(promises)
                .then(function (intents) {
                var sortedIntents = _.sortBy(_.compact(intents), 'score').reverse();
                sortedIntents = _.filter(sortedIntents, function (intent) { return intent.intent != 'None'; });
                resolve(sortedIntents);
            })
                .catch(reject);
        });
    };
    IntentScorer.prototype.scoreIntent = function (model, text, threashold) {
        if (threashold === void 0) { threashold = 0; }
        return new Promise(function (resolve, reject) {
            return request(model.url + encodeURIComponent(text))
                .then(function (result) {
                var json = JSON.parse(result);
                if (!json || !json.intents || !json.intents.length)
                    return resolve();
                if (json.intents[0].score < threashold)
                    return resolve();
                var intent = json.intents[0];
                intent.model = model.name;
                return resolve(intent);
            })
                .catch(reject);
        });
    };
    return IntentScorer;
}());
exports.IntentScorer = IntentScorer;
