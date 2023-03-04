import { RouteHandler } from '@orbstation/route/RouteHandler'
import { RequestCustomPayload } from '../../../lib/routing.js'
import fs from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const cached: { current: any } = {current: undefined}
const RapiDocJsFileHandler: RouteHandler<RequestCustomPayload> = async(_req, res) => {
    if(!cached.current) {
        cached.current = fs.readFileSync(path.join(__dirname, '../rapidoc/rapidoc.js'))?.toString()
    }
    if(!cached.current) {
        return res
            .status(404)
            .json({error: 'rapidoc.js not found'})
    }
    return res
        .status(200)
        .setHeader('Content-Type', 'application/javascript')
        .setHeader('cache-control', 'max-age=' + (3600 * 12) + ', public')
        .send(cached.current)
}

export default RapiDocJsFileHandler
