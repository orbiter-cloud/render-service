function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import Ajv from 'ajv';
export class SchemaService {
  constructor() {
    _defineProperty(this, "validator", void 0);

    _defineProperty(this, "validators", []);

    this.validator = new Ajv();
  }

  validate(schema, data) {
    const v = this.validators.find(v => v.s === schema);
    if (v) return {
      valid: v.v(data),
      errors: v.v.errors
    };
    const validator = this.validator.compile(schema);
    this.validators.push({
      v: validator,
      s: schema
    });
    return {
      valid: validator(data),
      errors: validator.errors
    };
  }

}