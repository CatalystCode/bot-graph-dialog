"use strict";
(function (NodeType) {
    NodeType[NodeType["sequence"] = 0] = "sequence";
})(exports.NodeType || (exports.NodeType = {}));
var NodeType = exports.NodeType;
var Node = (function () {
    function Node(node) {
        this.id = node.id;
        this.type = node.type;
        delete node.id;
        delete node.type;
        this.body = node;
    }
    return Node;
}());
exports.Node = Node;
