import { RouteDef } from '@orbstation/route/RouteDef'
import { ServiceService } from '../services.js'

export interface OpenApiSpec {
    summary?: string
    path?: string
    tags?: string[]
    parameters?: any[]
    responses?: { [k: string]: any }
    requestBody?: {
        description?: string
        required?: boolean
        content?: {
            'application/json'?: {
                schema: any
            }
            'application/xml'?: {
                schema: any
            }
            'text/plain'?: {
                schema: any
            }
        }
    }
}

export interface RouteOpenApi extends RouteDef {
    spec?: OpenApiSpec
    noSpec?: boolean
}

export class OpenApiGen {
    constructor() {
    }

    static pathToExpress(path: string, spec: OpenApiSpec): string {
        const pathParams = spec.parameters?.filter(p => p.in === 'path')
        const pathParts = path.slice(1).split('/')
        return '/' + pathParts.map(pathPart => {
            if(pathPart.startsWith('{') && pathPart.endsWith('}')) {
                const cleanName = pathPart.slice(1, -1).endsWith('+') ? pathPart.slice(1, -2) : pathPart.slice(1, -1)
                const tplParam = pathParams?.find(p => p.name === cleanName)
                if(!tplParam) {
                    throw new Error('OpenApiGen missing parameter for path template `' + cleanName + '` in `' + path + '`')
                }
                return ':' + tplParam?.name + (!tplParam?.required ? '?' : '')
            }
            return pathPart
        }).join('/')
    }

    generate(routes: RouteOpenApi[]) {
        const buildInfo = ServiceService.config('buildInfo')
        const packageVersion = ServiceService.config('packageVersion')
        const swagger = {
            'openapi': '3.1.0',
            'info': {
                'version': buildInfo?.GIT_COMMIT?.split('/')?.[2]?.slice(0, 6) || packageVersion || 'v0.0.1',
                'title': 'Orbito Render Service',
                'description': `Render data + tpl to optimized HTML, check out the [GitHub project](https://github.com/orbiter-cloud/render-service)`,
                'license': {
                    'name': 'MIT',
                    'url': 'https://github.com/orbiter-cloud/render-service/blob/main/LICENSE',
                },
            },
            'servers': [
                {
                    'url': 'http://localhost:4264',
                    'description': 'Local server',
                },
            ],
            'paths': {},
            'security': [
                {
                    'bearerAuth': [],
                },
            ],
            'components': {
                'securitySchemes': {
                    'bearerAuth': {
                        'type': 'http',
                        'scheme': 'bearer',
                        'bearerFormat': 'JWT',
                    },
                },
                'schemas': {},
            },
        }
        const specRoutes = routes.filter(r => !r.noSpec)
        for(const route of specRoutes) {
            const {id, method, path, spec} = route
            const specPath = spec?.path || path
            // @ts-ignore
            if(!swagger.paths[specPath]) {
                // @ts-ignore
                swagger.paths[specPath] = {}
            }
            // @ts-ignore
            const swagPath = swagger.paths[specPath]
            swagPath[method] = {
                summary: spec?.summary || id,
                operationId: id,
                tags: spec?.tags,
                parameters: spec?.parameters,
                requestBody: spec?.requestBody,
                responses: spec?.responses,
            }
        }
        return swagger
    }
}
