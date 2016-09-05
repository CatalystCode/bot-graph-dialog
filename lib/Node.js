"use strict";
var Node = (function () {
    function Node() {
    }
    Node.getSteps = function () {
        console.log('get steps');
        return [];
    };
    return Node;
}());
exports.Node = Node;
