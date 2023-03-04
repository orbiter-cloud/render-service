import express from 'express'
import { DELETE, GET, POST, PUT, PATCH } from '@orbstation/route/RouteDef'
import boot from './boot.js'
import { handlerErrorWrapper } from './lib/routing.js'
import { ErrorHandlerMiddleware } from '@orbstation/route/ErrorHandlerMiddleware'
import { OpenApiApp } from '@orbstation/oas/OpenApiApp'
import { routes } from './routes.js'

export const appStarter = () =>
    boot('api')
        .then((setup) => {
            const app = express()
            app.disable('x-powered-by')
            return {app, ...setup}
        })
        .then((setup) =>
            import ( './config/pipeline.js')
                .then((pipeline) => {
                    pipeline.default(setup)
                    return setup
                }),
        )
        .then((setup) => {
            const {extensions, ServiceService} = setup
            const oas = ServiceService.use(OpenApiApp)

            oas.addRoutes(...routes)

            extensions.list().forEach((extension) => {
                if(extension.routes) {
                    oas.addRoutes(
                        ...(typeof extension.routes === 'function' ?
                            extension.routes() :
                            extension.routes),
                    )
                }
            })

            return {oas, ...setup}
        })
        .then((setup) => {
            const {app, oas} = setup

            oas.getRoutes().forEach(({id, method, path, pathServer, handler, spec}) => {
                const routePath = pathServer ? pathServer : oas.pathToExpress(path, spec?.parameters)
                const handle = handlerErrorWrapper(id, handler)
                method === GET && app.get(routePath, handle)
                method === PUT && app.put(routePath, handle)
                method === POST && app.post(routePath, handle)
                method === PATCH && app.patch(routePath, handle)
                method === DELETE && app.delete(routePath, handle)
            })

            // caching `3h`
            //app.use('/', express.static(__dirname + '/demo', {maxAge: 3600 * 1000 * 3}))
            return setup
        })
        .then((setup) => {
            const {app} = setup
            // todo: find a better way to ensure that this is added after all routes
            app.use(ErrorHandlerMiddleware)
            return setup
        })
