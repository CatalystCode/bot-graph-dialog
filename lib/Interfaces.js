"use strict";
(function (NodeType) {
    NodeType[NodeType["text"] = 0] = "text";
    NodeType[NodeType["prompt"] = 1] = "prompt";
    NodeType[NodeType["score"] = 2] = "score";
    NodeType[NodeType["handler"] = 3] = "handler";
    NodeType[NodeType["sequence"] = 4] = "sequence";
    NodeType[NodeType["end"] = 5] = "end";
})(exports.NodeType || (exports.NodeType = {}));
var NodeType = exports.NodeType;
