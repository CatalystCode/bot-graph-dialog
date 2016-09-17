"use strict";
var common = require('./common');
var Scenario = (function () {
    function Scenario(condition, node) {
        if (node === void 0) { node = null; }
        this.condition = condition;
        this.node = node;
        this.steps = new common.List();
    }
    return Scenario;
}());
exports.Scenario = Scenario;
