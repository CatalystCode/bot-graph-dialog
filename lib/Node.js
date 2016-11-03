"use strict";
var Common_1 = require('./Common');
(function (NodeType) {
    NodeType[NodeType["text"] = 0] = "text";
    NodeType[NodeType["prompt"] = 1] = "prompt";
    NodeType[NodeType["score"] = 2] = "score";
    NodeType[NodeType["handler"] = 3] = "handler";
    NodeType[NodeType["sequence"] = 4] = "sequence";
    NodeType[NodeType["end"] = 5] = "end";
})(exports.NodeType || (exports.NodeType = {}));
var NodeType = exports.NodeType;
var Node = (function () {
    function Node(node, type) {
        this.id = node.id;
        if (typeof type === 'string') {
            this.type = NodeType[type];
            this.typeName = type;
        }
        else
            this.type = type;
        this.varname = node.varname || this.id;
        this.steps = new Common_1.List();
        this.scenarios = new Common_1.List();
        this.body = node;
        this.data = node.data;
    }
    return Node;
}());
exports.Node = Node;
