"use strict";
var Validator;
(function (Validator) {
    function validate(type, value, configuration) {
        var result = false;
        switch (type) {
            case 'date':
                result = this.validateDate(value, configuration);
                break;
            case 'regex':
                result = this.validateRegex(value, configuration);
                break;
        }
        return result;
    }
    Validator.validate = validate;
    function validateDate(value, configuration) {
        var date = value.resolution.start.getTime();
        if (configuration.min_date) {
            var dateMin = new Date(configuration.min_date).getTime();
            if (date < dateMin)
                return false;
        }
        if (configuration.max_date) {
            var dateMax = new Date(configuration.max_date).getTime();
            if (date > dateMax)
                return false;
        }
        return true;
    }
    Validator.validateDate = validateDate;
    function validateRegex(value, configuration) {
        var regex = new RegExp(configuration.pattern);
        var isValid = regex.test(value);
        return isValid;
    }
    Validator.validateRegex = validateRegex;
})(Validator = exports.Validator || (exports.Validator = {}));
