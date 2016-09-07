"use strict";
var common = require('./common');
(function (NodeType) {
    NodeType[NodeType["sequence"] = 0] = "sequence";
})(exports.NodeType || (exports.NodeType = {}));
var NodeType = exports.NodeType;
var Node = (function () {
    function Node(node) {
        this.id = node.id;
        this.type = node.type;
        this.steps = new common.List();
        this.scenarios = new common.List();
        this.body = node;
    }
    return Node;
}());
exports.Node = Node;
