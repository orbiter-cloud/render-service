import { performanceTag } from '@bemit/glog/performance'
import { RouteHandler } from '@orbstation/route/RouteHandler'
import path from 'path'
import { RequestCustomPayload } from '../lib/routing.js'
import { ServiceService } from '../services.js'
import { TemplateRegistry } from '@orbito/render/TemplateRegistry'
import { SchemaService } from '../service/SchemaService.js'
import { TemplateService } from '@orbito/render/TemplateService'
import { StyleService } from '@orbito/style/StyleService'
import { TemplateOptimizeService } from '../service/TemplateOptimizeService.js'
import { schemaTemplateOptimizeCss } from './TemplateStyleGeneratorHandler.js'

const boolOrDefault = (val: boolean | undefined, defaultVal: boolean) =>
    typeof val === 'undefined' ? defaultVal : val

export const schemaTemplateOptimize = {
    type: 'object',
    additionalProperties: false,
    properties: {
        minify: {
            type: 'boolean',
        },
        minifyHtmlOptions: {
            type: 'object',
            properties: {
                removeOptionalTags: {
                    type: 'boolean',
                },
                removeAttributeQuotes: {
                    type: 'boolean',
                },
                removeEmptyElements: {
                    type: 'boolean',
                },
            },
        },
        cleanCss: {
            type: 'boolean',
        },
        cleanCssWhitelist: {
            type: 'array',
            items: {
                type: 'string',
            },
        },
        inlineCss: {
            type: 'boolean',
        },
        ...schemaTemplateOptimizeCss.properties,
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
    const templateService = ServiceService.use(TemplateService)
    const styleService = ServiceService.use(StyleService)
    const optimizeService = ServiceService.use(TemplateOptimizeService)
    const templateRegistry = ServiceService.use(TemplateRegistry)
    const templateId = req.params.templateId
    // todo: correctly handle encoded paths and endless paths
    const fragmentId = req.params.fragmentId || req.params['0']
    // const fragmentId = req.params['0']
    // const typeId = req.body.type
    if(!fragmentId) {
        return res.status(400).send({error: 'fragmentId not set'})
    }
    if(fragmentId.match(/[.%]/g)) {
        return res.status(400).send({error: 'fragmentId contains invalid character `.` or `%`'})
    }

    const tagStartPrepare = performanceTag()
    const perfTags: {
        render: number
        styling: number
        optimize: number
        text: number | undefined
        prepare: number | undefined
        validate: number | undefined
    } = {
        render: 0,
        styling: 0,
        optimize: 0,
        text: undefined,
        prepare: undefined,
        validate: undefined,
    }

    const templateExists = await templateRegistry.exists(templateId)
    if(!templateExists) {
        return res.status(400).send({error: 'template not available'})
    }

    const styleId = req.body.style
    if(!styleId) {
        return res.status(400).send({error: 'style missing'})
    }

    const styleExists = await styleService.styleExists(templateRegistry.templatePathRoot, templateId, styleId)
    if(!styleExists) {
        return res.status(400).send({error: 'style not available'})
    }
    const tplExists = await templateRegistry.templateExists(templateId, fragmentId + '.twig')
    if(!tplExists) {
        return res.status(400).send({error: 'template fragment not available'})
    }
    const schemaService = ServiceService.use(SchemaService)

    perfTags.prepare = tagStartPrepare()
    const tagStartValidate = performanceTag()

    const optimizeValues = req.body.optimize
    const optimizeValuesValidity = schemaService.validate(schemaTemplateOptimize, optimizeValues)
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
    let rendered: undefined | string = undefined
    let renderedText: string | undefined = undefined
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

    try {
        const tagStartRender = performanceTag()
        rendered = await templateService.render(
            path.join(templateRegistry.templatePathRoot),
            templateId,
            fragmentId + '.twig',
            styleId,
            req.body.data || {},
            req.body.context || {},
        )
        perfTags.render = tagStartRender()

        if(style) {
            rendered = rendered?.replace('<style>', '<style>' + (() => {
                if(style?.startsWith('@charset "UTF-8";')) {
                    return style?.slice('@charset "UTF-8";'.length).trim()
                }
                return style
            })())
        }
    } catch(e) {
        console.error('TemplateRenderDocumentHandler failed to render', e)
        return res.status(500).send({
            error: 'server issue while rendering template',
        })
    }

    const tagStartOptimize = performanceTag()
    try {
        if(typeof rendered === 'string' && boolOrDefault(optimizeValues?.cleanCss, true)) {
            rendered = optimizeService.cleanStyling(
                rendered,
                undefined,
                Array.isArray(optimizeValues?.cleanCssWhitelist) ? optimizeValues?.cleanCssWhitelist : [],
            )
        }
    } catch(e) {
        console.error('TemplateRenderDocumentHandler failed to clean style', e)
        return res.status(500).send({
            error: 'server issue while cleaning style',
        })
    }

    try {
        if(typeof rendered === 'string' && boolOrDefault(optimizeValues?.inlineCss, false)) {
            rendered = await optimizeService.inlineStyling(rendered)
        }
    } catch(e) {
        console.error('TemplateRenderDocumentHandler failed to inline style', e)
        return res.status(500).send({
            error: 'server issue while producing inlining style',
        })
    }

    try {
        if(typeof rendered === 'string' && boolOrDefault(optimizeValues?.minify, true)) {
            rendered = optimizeService.minifyHtml(rendered, {
                collapseWhitespace: true,
                html5: true,
                ...(optimizeValues?.minifyHtmlOptions || {}),
            })
        }
        perfTags.optimize = tagStartOptimize()
    } catch(e) {
        console.error('TemplateRenderDocumentHandler failed to minify html', e)
        return res.status(500).send({
            error: 'server issue while producing minifying html',
        })
    }

    try {
        const tagStartText = performanceTag()
        if(typeof rendered === 'string' && req.body.renderText) {
            renderedText = await optimizeService.extractText(rendered)
        }
        perfTags.text = tagStartText()
    } catch(e) {
        console.error('TemplateRenderDocumentHandler failed to extract text', e)
        return res.status(500).send({
            error: 'server issue while extracting text output',
        })
    }

    if(req.get('Accept')?.startsWith('application/json')) {
        return res.status(200).send({
            id: templateId,
            fragment: fragmentId,
            rendered: rendered,
            renderedText: renderedText,
            // converted from `second + nanosecond` to `ms`
            timings: perfTags,
            renderTime: perfTags.styling + perfTags.render + perfTags.optimize,
        })
    }
    return res.status(200).send(rendered)
}

export default TemplateRenderDocumentHandler
