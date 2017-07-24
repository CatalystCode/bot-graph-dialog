"use strict";

exports.List = class {
    
  constructor() {
    this.items = [];
  }

  size() {
    return this.items.length;
  };

  add(value) {
    this.items.push(value);
  };

  get(index) {
    return index < this.size() ? this.items[index] : null;
  };
}

exports.Map = class {

  constructor() {
    this.items = {};
  }

  add(key, value) {
    this.items[key] = value;
  };

  has(key) {
    return key in this.items;
  };

  get(key) {
    return this.items[key];
  };

  keys() {
    return Object.keys(this.items);
  };

  values() {
    var items = this.items;
    return Object.keys(this.items).map(key => items[key]);
  };
}
