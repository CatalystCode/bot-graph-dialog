"use strict";
var jsep = require('jsep');
var ConditionHandler = (function () {
    function ConditionHandler() {
        console.log('ConditionerHandler intantiated');
    }
    ConditionHandler.evaluateExpression = function (object, expression) {
        var exp = expression;
        if (typeof exp == 'string') {
            exp = jsep(exp);
        }
        switch (exp.type) {
            case 'BinaryExpression':
                var value1 = this.evaluateExpression(object, exp.left);
                var value2 = this.evaluateExpression(object, exp.right);
                return this.calculateExpression(exp.operator, value1, value2);
            case 'UnaryExpression':
                var value = this.evaluateExpression(object, exp.argument);
                return this.calculateExpression(exp.operator, value, null);
            case 'Identifier':
                return object[exp.name];
            case 'MemberExpression':
                var parent = this.evaluateExpression(object, exp.object);
                return this.evaluateExpression(parent, exp.property);
            case 'Literal':
                return exp.value;
            default:
                throw new Error('condition type ' + exp.type + ' is not recognized');
        }
    };
    ConditionHandler.calculateExpression = function (operator, value1, value2) {
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
    };
    return ConditionHandler;
}());
exports.ConditionHandler = ConditionHandler;
