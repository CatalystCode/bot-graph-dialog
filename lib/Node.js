"use strict";

var Common = require('./Common');


class Node {

  constructor(node, type) {
    this.id = node.id;
    if (typeof type === 'string') {
      this.type = NodeType[type];
      this.typeName = type;
    }
    else
      this.type = type;

    this.varname = node.varname || this.id;
    this.steps = new Common.List();
    this.scenarios = new Common.List();
    this.body = node;
    this.data = node.data;
  }

}


var NodeType = {};
(function (NodeType) {
    NodeType[NodeType["text"] = 0] = "text";
    NodeType[NodeType["prompt"] = 1] = "prompt";
    NodeType[NodeType["score"] = 2] = "score";
    NodeType[NodeType["handler"] = 3] = "handler";
    NodeType[NodeType["sequence"] = 4] = "sequence";
    NodeType[NodeType["end"] = 5] = "end";
    NodeType[NodeType["heroCard"] = 6] = "heroCard";
    NodeType[NodeType["carousel"] = 7] = "carousel";
})(NodeType);

Node.NodeType = NodeType;

module.exports = Node;
