"use strict";
var List = (function () {
    function List() {
        this.items = [];
    }
    List.prototype.size = function () {
        return this.items.length;
    };
    List.prototype.add = function (value) {
        this.items.push(value);
    };
    List.prototype.get = function (index) {
        return index < this.size() ? this.items[index] : null;
    };
    return List;
}());
exports.List = List;
var Map = (function () {
    function Map() {
        this.items = {};
    }
    Map.prototype.add = function (key, value) {
        this.items[key] = value;
    };
    Map.prototype.has = function (key) {
        return key in this.items;
    };
    Map.prototype.get = function (key) {
        return this.items[key];
    };
    return Map;
}());
exports.Map = Map;
