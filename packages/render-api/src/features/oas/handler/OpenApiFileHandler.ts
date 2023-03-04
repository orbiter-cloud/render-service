import { RouteHandler } from '@orbstation/route/RouteHandler'
import { ServiceService } from '../../../services.js'
import { OpenApiApp } from '@orbstation/oas/OpenApiApp'
import { RequestCustomPayload } from '../../../lib/routing.js'
import Yaml from 'yaml'

const OpenApiFileHandler: RouteHandler<RequestCustomPayload> = async(req, res) => {
    const operationIdsRaw = req.query?.operations
    let operationIds: string[] | undefined = undefined
    if(typeof operationIdsRaw === 'string' && operationIdsRaw) {
        operationIds = operationIdsRaw.split(',').map(op => op.trim())
    }
    const oas = ServiceService.use(OpenApiApp)
    // if(req.query.download === 'yes' || req.query.download === 'true' || req.query.download === '1') {
    //     res = res.setHeader('Content-Type', 'application/javascript')
    // }
    if(req.query.download === 'yes' || req.query.download === 'true' || req.query.download === '1') {
        res = res.setHeader('Content-Disposition', 'attachment')
    }
    const oasSpec = oas.generate(operationIds)
    if(req.path.endsWith('.yml') || req.path.endsWith('.yaml')) {
        return res
            .setHeader('Content-Type', 'application/x-yaml')
            .status(200)
            .send(Yaml.stringify(oasSpec, {
                indent: 4,
                lineWidth: 600,
            }))
    }
    return res.status(200).json(oasSpec)
}

export default OpenApiFileHandler
