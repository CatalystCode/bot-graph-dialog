
var _ = require('underscore');
var request = require('request-promise');
var Promise = require('promise');

// Retreive the first intent from a LUIS api
function scoreIntent(model, text, threashold) {

  threashold = threashold || 0;
  return new Promise(function (resolve, reject) {
    request(model.url + encodeURIComponent(text))
      .then(function (result) {
        var json = JSON.parse(result);

        if (!json || !json.intents || !json.intents.length) return resolve(null);

        // In case when minumum score is required, enforce minimum score
        if (json.intents[0].score < threashold) return resolve(null);

        var intent = json.intents[0];
        intent.model = model.name;
        return resolve(intent);
      })
      .catch(reject);
  });
}

function collectIntents(models, text, threashold) {

  return new Promise(function (resolve, reject) {

    var promises = [];
    var intents = [];
    threashold = threashold || 0;
    models.forEach(function (model) {
      promises.push(scoreIntent(model, text, threashold));
    });

    Promise.all(promises)
      .then(function (intents) {
        var sortedIntents = _.sortBy(_.compact(intents), 'score').reverse();
        sortedIntents = _.filter(sortedIntents, function (intent) { return intent.intent != 'None' })
        resolve(sortedIntents);
      })
      .catch(reject);
  });  
}

module.exports = {
  collectIntents: collectIntents
};