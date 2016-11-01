import * as jsep from 'jsep';

/**
 * Parsing and calculating conditional expressions from strings
 * i.e.: age >= 30 & (age * 2) < 40
 */
export module ConditionHandler {

	// Recursively perform an evaluation of an expression
	export function evaluateExpression(object: any, expression: string | jsep.IExpression): any {
		var exp: jsep.IExpression = null;
		if (typeof expression == 'string') {
			exp = jsep(expression);
		} else {
			exp = expression;
		}

		// Analyze the expression according to its type
		switch (exp.type) {
			case 'BinaryExpression':
				var bexp = exp as jsep.IBinaryExpression;
				var value1 = this.evaluateExpression(object, bexp.left);
				var value2 = this.evaluateExpression(object, bexp.right);
				return this.calculateExpression(bexp.operator, value1, value2);

			case 'UnaryExpression':
				var uexp = exp as jsep.IUnaryExpression; 
				var value = this.evaluateExpression(object, uexp.argument);
				return this.calculateExpression(uexp.operator, value);

			case 'Identifier':
				return object[(exp as jsep.IIdentifier).name];

			case 'MemberExpression':
				var mexp = exp as jsep.IMemberExpression; 
				var parent = this.evaluateExpression(object, mexp.object);
				return this.evaluateExpression(parent, mexp.property);

			case 'Literal':
				return (exp as jsep.ILiteral).value;

			default:
				throw new Error('condition type ' + exp.type + ' is not recognized');
		}
	}

	// Calculate an expression accoring to the operator
	export function calculateExpression(operator: any, value1: any, value2: any = null) : any {
		switch (operator) {

			case '!':
				return !value1;

			case '<':
				return value1 < value2;

			case '>':
				return value1 > value2;

			case '<=':
				return value1 <= value2;

			case '>=':
				return value1 >= value2;

			case '=':
			case '==':
				return value1 == value2;

			case '===':
				return value1 === value2;

			case '!=':
			case '<>':
				return value1 != value2;
		
			case '!==':
				return value1 !== value2;

			case '-':
				return value1 - value2;

			case '+':
				return value1 + value2;

			case '*':
				return value1 * value2;

			case '/':
				return value1 / value2;

			case '%':
				return value1 % value2;

			default:
				break;
		}
	}
}
