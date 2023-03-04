import express from 'express'
import { ServiceContainer } from 'service-service'
import { OrbService, OrbServiceFeatures, OrbServiceFeature } from '@orbstation/service'
import { ProfilerMiddleware } from '../middleware/ProfilerMiddleware.js'
import { AppConfig } from './AppConfig.js'
import { AuthMiddleware } from '../middleware/AuthMiddleware.js'

export type AppPipelineSetup = {
    app: express.Express
    ServiceService: ServiceContainer<AppConfig>
    service: OrbService<OrbServiceFeatures<{ 'gcp:log': OrbServiceFeature, 'log:request': OrbServiceFeature }>>
}

export default (
    {app, service}: AppPipelineSetup,
) => {
    app.use(function corsMiddleware(_req: express.Request, res: express.Response, next: () => void) {
        // using a custom cors middleware, as the `express.cors` isn't CDN compatible (doesn't send headers when not needed)
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Methods', 'GET, PUT, PATCH, POST, DELETE, HEAD, OPTIONS')
        res.header('Access-Control-Allow-Headers', [
            'Content-Type',
            'Cache-Control',
            'Origin',
            'Accept',
            'Authorization',
            'Audience',
            'X-Cloud-Trace-Context',
            'X-Performance',
        ].join(', '))
        res.header('Access-Control-Expose-Headers', [
            'X-Cloud-Trace-Context',
            'X-Trace-Id',
            'X-Lb-Id',
            'X-Performance',
            // 'X-Rate-Left-10S',
            'X-Rate-Left-30S',
            // 'X-Rate-Left-1M',
            // 'X-Rate-Left-5M',
        ].join(', '))

        next()
    })

    app.use(ProfilerMiddleware({
        // todo: for feature toggles, this flag must be rechecked every request
        logRequest: service.features.enabled('log:request') && service.features.enabled('gcp:log'),
        labelsDefault: {},
    }))

    app.use(AuthMiddleware)

    app.use(express.json())
    app.use(express.urlencoded({extended: true}))
}
