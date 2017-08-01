"use strict";

class Validator {
  
  constructor() {
  }

  // validates a value against given type rule
  static validate(type, value, configuration) {
    switch (type) {
      case 'date':
        return Validator.validateDate(value, configuration);
      case 'regex':
        return Validator.validateRegex(value, configuration);
      default:
        return false;
    }
  }

  // validates a date
  static validateDate(value, configuration) {
    var date = value.resolution.start.getTime();

    if (configuration.min_date) {
      var dateMin = new Date(configuration.min_date).getTime();
      if (date < dateMin) return false;
    }

    if (configuration.max_date) {
      var dateMax = new Date(configuration.max_date).getTime();
      if (date > dateMax) return false;
    }

    return true;
  }

  static validateRegex(value, configuration) {
    var regex = new RegExp(configuration.pattern);
    var isValid = regex.test(value);
    return isValid;
  }

}

module.exports = Validator;
