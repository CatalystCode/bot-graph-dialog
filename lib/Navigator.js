"use strict";
var Navigator = (function () {
    function Navigator(root) {
        this.root = root;
        this.curr = null;
        if (!root) {
            throw new Error('root node was not provided');
        }
        this.curr = root;
    }
    Navigator.prototype.getNext = function (session) {
        return function (session, result, skip) {
        };
    };
    return Navigator;
}());
exports.Navigator = Navigator;
