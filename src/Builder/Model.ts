import {IModel} from './Model';
/// <reference path="../../typings/jquery/jquery.d.ts" />

export interface IModel {
  name() : string;
  name(name: string) : IModel;

  url() : string;
  url(url: string) : IModel;
}

export class Model implements IModel {

  private _name: string = null;
  private _url: string = null;

  constructor(name: string) {
    this.name(name);
  }

  name(name?: string) : any {
    if (typeof name === 'string') {
      this._name = name;
      return this;
    }
    return this._name;
  }

  url(url?: string) : any {
    if (typeof name === 'string') {
      this._url = url;
      return this;
    }
    return this._url;
  }
}

var m = new Model('asd') as IModel;
m.name('asd').url();

$('asd').text