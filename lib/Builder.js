"use strict";
var n = require('./Node');
var nv = require('./Navigator');
var strformat = require('strformat');
var Builder = (function () {
    function Builder() {
        this._root = null;
        this._curr = null;
        this._nav = null;
    }
    Builder.prototype.textNode = function (id, options) {
        if (options === void 0) { options = {}; }
        var newNode = new n.TextNode(this, id);
        this.updateMembers(newNode);
        return newNode;
    };
    Builder.prototype.promptNode = function (id, options) {
        if (options === void 0) { options = {}; }
        var newNode = new n.PromptNode(this, id);
        this.updateMembers(newNode);
        return newNode;
    };
    Builder.prototype.root = function () {
        return this._root;
    };
    Builder.prototype.navigator = function () {
        return this._nav;
    };
    Builder.prototype.updateMembers = function (node) {
        if (!this._root) {
            this._root = node;
            this._nav = new nv.Navigator(node);
        }
        this._nav.addNode(node);
        if (this._curr) {
            this._curr.next(node);
            node.prev(this._curr);
        }
        else {
            this._curr = node;
        }
        return node;
    };
    return Builder;
}());
exports.Builder = Builder;
