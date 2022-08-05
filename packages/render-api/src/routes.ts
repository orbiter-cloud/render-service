import { GET, POST } from '@orbstation/route/RouteDef'
import { schemaTemplateOptimize } from './handler/TemplateRenderDocumentHandler.js'
import { schemaTemplateOptimizeCss } from './handler/TemplateStyleGeneratorHandler.js'
import { RouteOpenApi } from './lib/OpenApiGen.js'
import { dynamicLoader } from './lib/routing.js'

const apiPrefix = ''

export const routes: RouteOpenApi[] = [
    {
        id: 'home', method: GET, path: apiPrefix + '/',
        handler: dynamicLoader(() => import ('./handler/HomeHandler.js').then(module => module.default)),
        noSpec: true,
    }, {
        id: 'template.document-type.list', method: GET, path: apiPrefix + '/template/{templateId}/document-types',
        handler: dynamicLoader(() => import ('./handler/TemplateDocumentTypesListHandler.js').then(module => module.default)),
        spec: {
            parameters: [
                {
                    in: 'path',
                    name: 'templateId',
                    required: true,
                    description: 'ID of template',
                    schema: {
                        type: 'string',
                    },
                },
            ],
        },
    }, {
        id: 'template.document-type.details', method: GET, path: apiPrefix + '/template/{templateId}/document-type/{typeId}',
        handler: dynamicLoader(() => import ('./handler/TemplateDocumentTypeDetailsHandler.js').then(module => module.default)),
        spec: {
            parameters: [
                {
                    in: 'path',
                    name: 'templateId',
                    required: true,
                    description: 'ID of template',
                    schema: {
                        type: 'string',
                    },
                },
                {
                    in: 'path',
                    name: 'typeId',
                    required: true,
                    description: 'Document type ID',
                    schema: {
                        type: 'string',
                    },
                },
            ],
        },
    }, {
        id: 'template.render.document', method: POST,
        path: apiPrefix + '/template/:templateId/render/*',
        handler: dynamicLoader(() => import ('./handler/TemplateRenderDocumentHandler.js').then(module => module.default)),
        spec: {
            path: apiPrefix + '/template/{templateId}/render/{fragmentId}',
            parameters: [
                {
                    in: 'path',
                    name: 'templateId',
                    required: true,
                    description: 'ID of template',
                    schema: {
                        type: 'string',
                    },
                },
                {
                    in: 'path',
                    name: 'fragmentId',
                    required: true,
                    description: 'Template file pointer.',
                    schema: {
                        type: 'string',
                    },
                },
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                style: {
                                    type: 'string',
                                },
                                optimize: schemaTemplateOptimize,
                                styleVars: {
                                    type: 'object',
                                },
                                data: {
                                    type: 'object',
                                },
                                context: {
                                    type: 'object',
                                },
                                renderText: {
                                    type: 'boolean',
                                },
                            }
                        },
                    },
                },
            },
        },
    }, {
        id: 'template.style', method: POST, path: apiPrefix + '/template/{templateId}/style/{styleId}',
        handler: dynamicLoader(() => import ('./handler/TemplateStyleGeneratorHandler.js').then(module => module.default)),
        spec: {
            parameters: [
                {
                    in: 'path',
                    name: 'templateId',
                    required: true,
                    description: 'ID of template',
                    schema: {
                        type: 'string',
                    },
                },
                {
                    in: 'path',
                    name: 'styleId',
                    required: true,
                    description: 'Name of SCSS file, without extension.',
                    schema: {
                        type: 'string',
                    },
                },
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                optimize: schemaTemplateOptimizeCss,
                                styleVars: {
                                    type: 'object',
                                },
                            }
                        },
                    },
                },
            },
        },
    },
]
