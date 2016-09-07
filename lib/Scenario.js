"use strict";
var common = require('./common');
var Scenario = (function () {
    function Scenario(condition) {
        this.condition = condition;
        this.steps = new common.List();
    }
    return Scenario;
}());
exports.Scenario = Scenario;
