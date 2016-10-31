export class Expression {
  type: string;  

  constructor(expression: string);
}

export interface ILiteral extends Expression {
  type: "Literal";
  value: any;
  raw: string;
}

export interface IIdentifier extends Expression {
  type: 'Identifier'
  name: string;
}

export interface IBinaryExpression extends Expression {
  type: 'BinaryExpression';
  operator: string;
  left: Expression;
  right: Expression;
}

export interface IUnaryExpression extends Expression {
  type: 'UnaryExpression';
  operator: string;
  argument: Expression;
  prefix: boolean;
}

export interface IMemberExpression extends Expression {
  type: 'MemberExpression';
  computed: boolean;
  object: Expression;
  property: Expression;
}