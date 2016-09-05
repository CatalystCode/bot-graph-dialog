"use strict";
var Navigator = (function () {
    function Navigator(options) {
        this.options = options;
        this.initGraphNodes(options.graph);
    }
    Navigator.prototype.getSteps = function () {
        console.log('get steps');
        return [];
    };
    Navigator.prototype.initGraphNodes = function (graph) {
    };
    return Navigator;
}());
exports.Navigator = Navigator;
