


export class Utils {

	public static loadJson(path: string): any {
		let graph: any = null;
		try {
			graph = require(path);
		}
		catch (err) {
			console.error(`error loading json: ${path}`);
			throw err;
		}
		return graph;
	}

}
