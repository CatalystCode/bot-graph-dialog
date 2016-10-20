

/*
export interface IHandler {
    handle: () => void
}

*/
/*
export abstract class Handler implements IHandler {

	public handle = () => {

	}

}
*/


export class List<T> {
    private items: Array<T>;

    constructor() {
        this.items = [];
    }

    size(): number {
        return this.items.length;
    }

    add(value: T): void {
        this.items.push(value);
    }

    get(index: number): T {
        return index < this.size() ? this.items[index] : null;
    }
}

export class Map<T> {
    private items: { [key: string]: T };

    constructor() {
        this.items = {};
    }

    add(key: string, value: T): void {
        this.items[key] = value;
    }

    has(key: string): boolean {
        return key in this.items;
    }

    get(key: string): T {
        return this.items[key];
    }

    /*
    keys() : string[] {
        return Object.keys(this.items);
    }

    values(): T[] {
        return Object.keys(this.items).map(key => this.items[key]);
    }
    */
}

export function setIf<T1 extends { data?: any }, T2>(_this: T1, prop: string, value: T2) : T1 | T2{

  // In case searching in data property
  if (prop && prop.indexOf('data.') === 0) {
    _this = _this.data;
    prop = prop.substr('data.'.length);
  }

  if (typeof value !== 'undefined') {
    _this[prop] = value;
    return _this;
  }
  return _this[prop];
} 
