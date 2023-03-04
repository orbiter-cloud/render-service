import { CommandHandler } from '@orbstation/command/CommandHandler'
import path, { dirname } from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { ServiceService } from '../../../services.js'
import { OpenApiApp } from '@orbstation/oas/OpenApiApp'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const openapiCommand: CommandHandler['run'] = async() => {
    const oas = ServiceService.use(OpenApiApp)
    const openApiFile = path.resolve(__dirname, '../openapi.json')
    fs.writeFileSync(openApiFile, JSON.stringify(oas.generate(), undefined, 4))
    console.log('Generated OpenAPI file: ' + openApiFile)
}

export const command: CommandHandler = {
    help: `Generates a new openapi.json`,
    run: openapiCommand,
}
