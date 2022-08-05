import { performanceTag } from '@bemit/glog/performance'
import { RouteHandler } from '@orbstation/route/RouteHandler'
import { RequestCustomPayload } from '../lib/routing.js'
import { ServiceService } from '../services.js'
import { TemplateRegistry } from '@orbito/render/TemplateRegistry'
import { SchemaService } from '../service/SchemaService.js'
import { StyleService } from '@orbito/style/StyleService'

const boolOrDefault = (val: boolean | undefined, defaultVal: boolean) =>
    typeof val === 'undefined' ? defaultVal : val


export const schemaTemplateOptimizeCss = {
    type: 'object',
    additionalProperties: false,
    properties: {
        nanoCss: {
            type: 'boolean',
        },
        cssAutoPrefix: {
            type: 'boolean',
        },
    },
}

const TemplateRenderDocumentHandler: RouteHandler<RequestCustomPayload> = async(req, res) => {
    const accessConfig = ServiceService.config('accessConfig')
    if(!accessConfig?.publicRenderApi) {
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

    // const twigBuilder = ServiceService.use(TwigBuilder)
    const styleService = ServiceService.use(StyleService)
    const templateRegistry = ServiceService.use(TemplateRegistry)
    const templateId = req.params.templateId
    const styleId = req.params.styleId

    const tagStartPrepare = performanceTag()
    const perfTags: {
        styling: number
        prepare: number | undefined
        validate: number | undefined
    } = {
        styling: 0,
        prepare: undefined,
        validate: undefined,
    }

    const templateExists = await templateRegistry.exists(templateId)
    if(!templateExists) {
        return res.status(400).send({error: 'template not available'})
    }

    const styleExists = await styleService.styleExists(templateRegistry.templatePathRoot, templateId, styleId)
    if(!styleExists) {
        return res.status(400).send({error: 'style not available'})
    }
    const schemaService = ServiceService.use(SchemaService)

    perfTags.prepare = tagStartPrepare()
    const tagStartValidate = performanceTag()

    const optimizeValues = req.body.optimize
    const optimizeValuesValidity = schemaService.validate(schemaTemplateOptimizeCss, optimizeValues)
    if(!optimizeValuesValidity.valid) {
        return res.status(400).send({
            error: 'optimize is invalid',
            error_details: optimizeValuesValidity.errors.map(e => ({
                rule: e.schemaPath,
                error: e.message,
                params: e.params,
            })),
        })
    }

    perfTags.validate = tagStartValidate()
    const tagStartStyle = performanceTag()
    let style: undefined | string = undefined
    try {
        style = await styleService.buildCss(
            templateRegistry.templatePathRoot,
            templateId,
            styleId,
            req.body.styleVars || {},
            {
                nanoCss: boolOrDefault(optimizeValues?.nanoCss, true),
                cssAutoPrefix: boolOrDefault(optimizeValues?.cssAutoPrefix, false),
            },
        )

        perfTags.styling = tagStartStyle()
    } catch(e) {
        console.error('TemplateRenderDocumentHandler failed to transpile Sass (scss)', e)
        return res.status(500).send({
            error: 'server issue while producing css',
        })
    }

    if(req.get('Accept')?.startsWith('application/json')) {
        return res.status(200).send({
            id: templateId,
            // fragment: fragmentId,
            // rendered: rendered,
            // renderedText: renderedText,
            // converted from `second + nanosecond` to `ms`
            styleId: styleId,
            style: style,
            timings: perfTags,
            styleTime: perfTags.styling,
        })
    }
    return res.header('Content-Type', 'text/css').status(200).send(style)
}

export default TemplateRenderDocumentHandler
