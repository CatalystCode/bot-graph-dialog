"use strict";
var LuisModel = (function () {
    function LuisModel(name, url) {
        this.name = name;
        this.url = url;
    }
    return LuisModel;
}());
exports.LuisModel = LuisModel;
var IntentScore = (function () {
    function IntentScore(name, model, score) {
        this.name = name;
        this.model = model;
        this.score = score;
    }
    return IntentScore;
}());
exports.IntentScore = IntentScore;
