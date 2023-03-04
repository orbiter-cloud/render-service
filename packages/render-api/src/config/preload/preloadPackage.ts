import { dirname } from 'path'
import fs from 'fs'

export default function(baseFolder: string) {
    let packageJson: { name?: string, version?: string, [k: string]: unknown } = {}
    try {
        packageJson = JSON.parse(fs.readFileSync(baseFolder + '/package.json', 'utf8'))
    } catch(e) {
        try {
            packageJson = JSON.parse(fs.readFileSync(dirname(baseFolder) + '/package.json', 'utf8'))
        } catch(e) {
            // noop
        }
    }
    return packageJson
}
