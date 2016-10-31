
declare module 'jsep' {
  export class jsep {
    type: string;  

    constructor(expression: string);
  }

  export interface ILiteral extends jsep {
    type: "Literal";
    value: any;
    raw: string;
  }

  export interface IIdentifier extends jsep {
    type: 'Identifier'
    name: string;
  }

  export interface IBinaryExpression extends jsep {
    type: 'BinaryExpression';
    operator: string;
    left: jsep;
    right: jsep;
  }

  export interface IUnaryExpression extends jsep {
    type: 'UnaryExpression';
    operator: string;
    argument: jsep;
    prefix: boolean;
  }

  export interface IMemberExpression extends jsep {
    type: 'MemberExpression';
    computed: boolean;
    object: jsep;
    property: jsep;
  }
}