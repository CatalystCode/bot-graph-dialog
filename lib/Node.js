"use strict";

var Common = require('./Common');

// the Node class representing a node in the dialog graph
class Node {

  constructor(node, type) {
    if (!node.id) throw new Error(`node does not have an 'id'`);
    this.id = node.id;
    
    // resolve node type
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
    this.stop = node.stop;

    this._customType_ = true;
  }

}

// types of nodes currently supported natively
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
    NodeType[NodeType["list"] = 8] = "list";
    NodeType[NodeType["adaptive"] = 9] = "adaptive";
})(NodeType);

Node.NodeType = NodeType;

module.exports = Node;
