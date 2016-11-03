"use strict";
var Common_1 = require('./Common');
var Scenario = (function () {
    function Scenario(condition, node) {
        if (node === void 0) { node = null; }
        this.condition = condition;
        this.node = node;
        this.steps = new Common_1.List();
    }
    return Scenario;
}());
exports.Scenario = Scenario;
