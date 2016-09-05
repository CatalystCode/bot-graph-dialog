
import navigator = require('./Navigator');
import node = require('./Node');



export interface IGraphDialogOptions extends navigator.INavigatorOptions { 
	
}

export class GraphDialog {

	private nav: navigator.Navigator;

	constructor(private options: IGraphDialogOptions) {
		this.nav = new navigator.Navigator(options);
	}

	public getSteps(): any[] {
			console.log('get steps');
			return [];
	}

}
