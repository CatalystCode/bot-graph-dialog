"use strict";
var Utils = (function () {
    function Utils() {
    }
    Utils.loadJson = function (path) {
        var graph = null;
        try {
            graph = require(path);
        }
        catch (err) {
            console.error("error loading json: " + path);
            throw err;
        }
        return graph;
    };
    return Utils;
}());
exports.Utils = Utils;
