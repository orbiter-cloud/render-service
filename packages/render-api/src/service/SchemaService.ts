import Ajv from 'ajv'

export class SchemaService {
    protected readonly validator: Ajv
    protected readonly validators: { v: any, s: any }[] = []

    constructor() {
        this.validator = new Ajv({
            strictSchema: false,
            validateFormats: false,
            // even by small schemas, `validateSchema: true` costs 20ms-50ms locally
            validateSchema: false,
        })
    }

    public validate(schema: any, data: any) {
        const v = this.validators.find(v => v.s === schema)
        if(v) return {
            valid: v.v(data),
            errors: v.v.errors,
        }
        const validator = this.validator.compile(schema)
        this.validators.push({v: validator, s: schema})
        return {
            valid: validator(data),
            errors: validator.errors,
        }
    }
}
