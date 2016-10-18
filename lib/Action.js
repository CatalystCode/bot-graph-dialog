"use strict";
var CustomNodeTypeHandler = (function () {
    function CustomNodeTypeHandler(name, execute) {
        this.name = name;
        this.execute = execute;
    }
    return CustomNodeTypeHandler;
}());
exports.CustomNodeTypeHandler = CustomNodeTypeHandler;
