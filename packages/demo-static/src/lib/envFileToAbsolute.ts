import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const envFileToAbsolute = (envVar: string | undefined): string | undefined => {
    if(!envVar) return undefined
    if(envVar.indexOf('//') === -1 && !envVar.startsWith('/')) {
        envVar = path.join(__dirname, '../', envVar)
    }
    return envVar
}
