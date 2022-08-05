import { GET, RouteDef } from '@orbstation/route/RouteDef'

import { dynamicLoader } from './lib/routing.js'

const apiPrefix = ''

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

export const routes: RouteOpenApi[] = [
    {
        id: 'home', method: GET, path: apiPrefix + '/',
        handler: dynamicLoader(() => import ('./handler/HomeHandler.js').then(module => module.default)),
        noSpec: true,
    },
]
