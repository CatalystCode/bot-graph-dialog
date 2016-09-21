

/*import { Parser } from './Parser';
import { Navigator } from './Navigator';
import { IntentScorer } from './IntentScorer';
import interfaces = require('./Interfaces');
*/

import n = require('./Node');
import nv = require('./Navigator');

import builder = require('botbuilder');
import path = require('path');

var strformat = require('strformat');

// TODO create IntentGrapgDialog that extends IntentDialog

export class Builder {

  private _root: n.INode = null;
  private _curr: n.INode = null;
  private _nav: nv.INavigator = null;

	constructor() {
	
	}

  // TODO switch to generics node<T>
  public textNode(id?: string, options: n.ITextNodeOptions = {}) : n.TextNode {
    let newNode = new n.TextNode(this, id);
    this.updateMembers(newNode);
    return newNode;
  }

  public root(): n.INode {
    return this._root;
  }

  public navigator() : nv.INavigator {
    return this._nav;
  }

  private updateMembers(node: n.INode) {
    if (!this._root) {
      this._root = node;
      this._nav = new nv.Navigator(node);
    }

    if (this._curr) {
      this._curr.next(node);
      node.prev(this._curr);
    }
    else {
      this._curr = node;
    }

    return node;
  }

}
