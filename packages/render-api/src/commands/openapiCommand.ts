import { CommandHandler } from '@orbstation/command/CommandHandler'
import path, { dirname } from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { OpenApiGen } from '../lib/OpenApiGen.js'
import { routes } from '../routes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const openapiCommand: CommandHandler['run'] = async() => {
    const swagGen = new OpenApiGen()
    const openApiFile = path.resolve(__dirname, '../openapi.json')
    fs.writeFileSync(openApiFile, JSON.stringify(swagGen.generate(routes), undefined, 4))
    console.log('Generated OpenAPI file: ' + openApiFile)
}

export const command: CommandHandler = {
    help: `Generates a new openapi.json`,
    run: openapiCommand,
}
