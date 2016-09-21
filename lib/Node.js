"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Builder_1 = require('./Builder');
exports.NodeTypes = {
    text: 'text',
    prompt: 'prompt',
    score: 'score',
    handler: 'handler',
    sequence: 'sequence',
    end: 'end'
};
var Node = (function () {
    function Node(builder, type, id) {
        if (!(builder instanceof Builder_1.Builder)) {
            throw new Error('Builder was not provided');
        }
        this._builder = builder;
        if (typeof type !== 'string') {
            throw new Error('Please provide node type');
        }
        this._type = type;
        if (typeof id === 'string') {
            this._id = id;
        }
        else {
            this._id = (typeof this) + '_' + (Node.idCount++);
        }
        console.log("Node id " + this._id + " of type " + typeof this + " instantiated");
    }
    Node.prototype.id = function () {
        return this._id;
    };
    Node.prototype.type = function () {
        return this._type;
    };
    Node.prototype.next = function (next) {
        if (next) {
            this._next = next;
            return this;
        }
        return this._next;
    };
    Node.prototype.prev = function (prev) {
        if (prev) {
            this._prev = prev;
            return this;
        }
        return this._prev;
    };
    Node.prototype.end = function () {
        return this._builder;
    };
    Node.prototype.varname = function (varname) {
        if (typeof varname === 'string') {
            this._varname = varname;
            return this;
        }
        return this._varname;
    };
    Node.idCount = 1;
    return Node;
}());
exports.Node = Node;
var TextNode = (function (_super) {
    __extends(TextNode, _super);
    function TextNode(builder, options) {
        if (options === void 0) { options = {}; }
        _super.call(this, builder, exports.NodeTypes.text, options.id);
        this.options = options;
        this._text = '';
        this.text(options.text);
    }
    TextNode.prototype.text = function (text) {
        if (typeof text === 'string') {
            this._text = text;
            return this;
        }
        return this._text;
    };
    return TextNode;
}(Node));
exports.TextNode = TextNode;
var PromptNode = (function (_super) {
    __extends(PromptNode, _super);
    function PromptNode(builder, options) {
        if (options === void 0) { options = {}; }
        _super.call(this, builder, exports.NodeTypes.prompt, options.id);
        this.options = options;
        this._text = '';
        this.text(options.text);
    }
    PromptNode.prototype.text = function (text) {
        if (typeof text === 'string') {
            this._text = text;
            return this;
        }
        return this._text;
    };
    return PromptNode;
}(Node));
exports.PromptNode = PromptNode;
