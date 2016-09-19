"use strict";
var Common_1 = require('./Common');
var interfaces = require('./Interfaces');
var Node = (function () {
    function Node(node, type) {
        this.id = node.id;
        if (typeof type === 'string')
            this.type = interfaces.NodeType[type];
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
