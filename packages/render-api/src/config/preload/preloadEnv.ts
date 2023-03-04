import dotenv from 'dotenv'
import { dirname } from 'path'
import process from 'process'

export default function(baseFolder: string) {
    let dotenvRes = dotenv.config({
        path: baseFolder + '/.env',
    })

    if(dotenvRes.error) {
        if(dotenvRes.error.message.indexOf('ENOENT:') === 0) {
            dotenvRes = dotenv.config({
                path: dirname(baseFolder) + '/.env',
            })
        }
        if(dotenvRes.error) {
            console.error('dotenvRes.error', dotenvRes.error)
            process.exit(1)
        }
    }
}
