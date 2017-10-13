"use strict";
var jsep = require('jsep');

/**
 * Parsing and calculating conditional expressions from strings
 * i.e.: age >= 30 & (age * 2) < 40
 */
class ConditionHandler {

  /**
	 * Recursively perform an evaluation of an expression
	 * @param  {any} object
	 * @param  {string|jsep.IExpression} expression
	 * @returns any
   */
  static evaluateExpression(object, expression) {
    var exp = typeof expression === 'string' ? jsep(expression) : expression;
    
    switch (exp.type) {
      case 'BinaryExpression':
        var bexp = exp;
        var value1 = this.evaluateExpression(object, bexp.left);
        var value2 = this.evaluateExpression(object, bexp.right);
        return this.calculateExpression(bexp.operator, value1, value2);

      case 'UnaryExpression':
        var uexp = exp;
        var value = this.evaluateExpression(object, uexp.argument);
        return this.calculateExpression(uexp.operator, value);

      case 'Identifier':
        return object[exp.name];

      case 'MemberExpression':
        var mexp = exp;
        var parent = this.evaluateExpression(object, mexp.object);
        return this.evaluateExpression(parent, mexp.property);

      case 'Literal':
        return exp.value;

      default:
        throw new Error('condition type ' + exp.type + ' is not recognized');
    }
  }
  
  /**
	 * Calculate an expression accoring to the operator
	 * @param  {any} operator
	 * @param  {any} value1
	 * @param  {any=null} value2
	 * @returns any
	 */
  static calculateExpression(operator, value1, value2) {
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

module.exports = ConditionHandler;
