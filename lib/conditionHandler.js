var jsep = require('jsep');

/**
 * evaluateExpression
 * ===============
 * return true/false based on the expression
 * can use numbers, session variables, and comparrison operators
 * Example 1: if (evaluateExpression(session.dialogData, 'days > 7')) {...}
 * Example 2: if (evaluateExpression(session.dialogData, 'age - years > 20')) {...}
 */
function evaluateExpression(object, expression) {

  var exp = expression;
  if (typeof exp == 'string') {
    exp = jsep(exp);
  }

  switch (exp.type) {
    case 'BinaryExpression':
      var value1 = evaluateExpression(object, exp.left);
      var value2 = evaluateExpression(object, exp.right);
      return calculateExpression(exp.operator, value1, value2);

    case 'UnaryExpression':
      var value = evaluateExpression(object, exp.argument);
      return calculateExpression(exp.operator, value);

    case 'Identifier':
      return object[exp.name];

    case 'MemberExpression':
      var parent = evaluateExpression(object, exp.object);
      return evaluateExpression(parent, exp.property);

    case 'Literal':
      return exp.value;

    default:
      throw new Error('condition type ' + exp.type + ' is not recognized');
  }
}

function calculateExpression(operator, value1, value2) {
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

module.exports = {
  evaluateExpression: evaluateExpression
};