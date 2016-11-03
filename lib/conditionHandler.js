"use strict";
var jsep = require('jsep');
var ConditionHandler;
(function (ConditionHandler) {
    function evaluateExpression(object, expression) {
        var exp = null;
        if (typeof expression == 'string') {
            exp = jsep(expression);
        }
        else {
            exp = expression;
        }
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
    ConditionHandler.evaluateExpression = evaluateExpression;
    function calculateExpression(operator, value1, value2) {
        if (value2 === void 0) { value2 = null; }
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
    ConditionHandler.calculateExpression = calculateExpression;
})(ConditionHandler = exports.ConditionHandler || (exports.ConditionHandler = {}));
