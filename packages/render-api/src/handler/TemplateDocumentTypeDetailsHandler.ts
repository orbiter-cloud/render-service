import { RouteHandler } from '@orbstation/route/RouteHandler'
import { RequestCustomPayload } from '../lib/routing.js'
import { ServiceService } from '../services.js'
import { TemplateRegistry } from '@orbito/render/TemplateRegistry'

const TemplateDocumentTypesListHandler: RouteHandler<RequestCustomPayload> = async(req, res) => {
    const accessConfig = ServiceService.config('accessConfig')
    if(!accessConfig?.publicDescribeApi) {
        if(!req.authId) {
            return res.status(401).send({
                error: 'no-anonym-access',
            })
        }

        if(!req.authId.sub) {
            return res.status(401).send({
                error: 'authentication-sub-missing',
            })
        }
    }

    const templateRegistry = ServiceService.get<TemplateRegistry>('TemplateRegistry')
    const templateId = req.params.templateId
    const typeId = req.params.typeId
    const templateData = await templateRegistry.getConfig(templateId)
    if(!templateData) {
        return res.status(404).send({error: 'template not found'})
    }
    const type = templateData['document-types'][typeId]
    const data = {
        label: type.label,
        meta: await templateRegistry.getDocTypeMetaSchema(templateId, typeId),
        sections: type.sections,
        //schema: type.schema,
        /*schema: {
            '$ref': req.protocol + '://' + req.get('host') + '/template/' + templateId + '/document-type/' + typeId + '/schema',
        },*/
    }
    return res.status(200).send(data)
}

export default TemplateDocumentTypesListHandler
