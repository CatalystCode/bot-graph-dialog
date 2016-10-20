/*import { Parser } from './Parser';
import { Navigator } from './Navigator';
import { IntentScorer } from './IntentScorer';
import interfaces = require('./Interfaces');
*/

import n = require('./Node');
import nv = require('./Navigator');
import { Dialog, IDialog } from './Dialog';
import { Model, IModel } from './Model';

import builder = require('botbuilder');
import path = require('path');

var strformat = require('strformat');

// TODO create IntentGrapgDialog that extends IntentDialog

export class Builder {

  private _root: n.INode = null;
  private _curr: n.INode = null;
  private _nav: nv.Navigator = null;

	constructor() {
	
	}

  // TODO switch to generics node<T>
  public text(id?: string, options: n.ITextNodeOptions = {}) : n.TextNode {
    let newNode = new n.TextNode(this, id);
    this.updateMembers(newNode);
    return newNode;
  }

  public prompt(id?: string, options: n.ITextNodeOptions = {}) : n.PromptNode {
    let newNode = new n.PromptNode(this, id);
    this.updateMembers(newNode);
    return newNode;
  }

  public score(id?: string) : n.ScoreNode {
    let newNode = new n.ScoreNode(this, id);
    this.updateMembers(newNode);
    return newNode;
  }

  public root(): n.INode {
    return this._root;
  }

  public navigator(options) : nv.INavigator {
    return this._nav;
  }

  public dialog(id: string) : IDialog {
    return new Dialog(id);
  }

  public model(name: string) : IModel {
    return new Model(name);
  }

  public scenario() : any {
    
  }

  private updateMembers(node: n.INode) {
    if (!this._root) {
      this._root = node;
      this._nav = new nv.Navigator(node);
    }
    // navigator exists, add node
    this._nav.addNode(node);
  
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
