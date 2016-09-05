"use strict";
var navigator = require('./Navigator');
var GraphDialog = (function () {
    function GraphDialog(options) {
        this.options = options;
        this.nav = new navigator.Navigator(options);
    }
    GraphDialog.prototype.getSteps = function () {
        console.log('get steps');
        return [];
    };
    return GraphDialog;
}());
exports.GraphDialog = GraphDialog;
