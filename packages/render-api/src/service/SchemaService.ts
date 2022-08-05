import Ajv from 'ajv'

export class SchemaService {
    protected readonly validator: Ajv
    protected readonly validators: { v: any, s: any }[] = []

    constructor() {
        this.validator = new Ajv()
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
