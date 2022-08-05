import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { OpenApiGen } from './lib/OpenApiGen.js'
import { routes } from './routes.js'
import { DELETE, GET, POST, PUT, PATCH } from '@orbstation/route/RouteDef'
import {
    RequestCustomPayload, handlerErrorWrapper,
} from './lib/routing.js'
import process from 'process'
import { getPerformanceInMs } from '@bemit/glog/performance'
import { LogManager } from '@bemit/glog/LogManager'
import boot from './boot.js'
import onHeaders from 'on-headers'
import { ServiceService } from './services.js'
import RapiDocHandler from './handler/RapiDocHandler.js'
import { AuthMiddleware } from './middleware/AuthMiddleware.js'
import { customAlphabet } from 'nanoid'
import { ErrorHandlerMiddleware } from '@orbstation/route/ErrorHandlerMiddleware'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const {logId, logProject, serviceId, buildInfo} = boot()

const app = express()

app.use(function corsMiddleware(_req: express.Request, res: express.Response, next: () => void) {
    // using a custom cors middleware, as the `express.cors` isn't CDN compatible (doesn't send headers when not needed)
    res.header('Access-Control-Allow-Origin', '*')
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
    ].join(', '))

    next()
})

const nanoTrace = customAlphabet('0123456789abcdefghijklmnopqrstuvwxqzABCDEFGHIJKLMNOPQRSTUVWXQZ', 32)
const nanoTraceSpan = customAlphabet('0123456789', 16)

app.use(function profilerMiddleware(req: express.Request & RequestCustomPayload, res: express.Response, next: () => void) {
    const startTime = process.hrtime()
    const traceId: string = req.header('X-Trace-Id') || req.header('X-Request-Id') || nanoTrace()
    const spanId = req.header('X-Trace-Id') ? req.header('X-Request-Id') : nanoTraceSpan()
    req.trace = traceId as string
    onHeaders(res, function() {
        const now = process.hrtime(startTime)
        const dur = getPerformanceInMs(now)
        res.setHeader('X-Performance', dur)
        if(traceId) {
            res.setHeader('X-Trace-Id', traceId)
        }
        res.removeHeader('X-Powered-By')

        if(
            (req.method === 'OPTIONS' && (res.statusCode === 200 || res.statusCode === 404)) ||
            (req.method !== 'OPTIONS' && res.statusCode === 400)
        ) {
            return
        }
        if(!ServiceService.config('googleLog')) {
            return
        }
        const logManager = ServiceService.use(LogManager)
        const logger = logManager.getLogger(logId + '--' + process.env.APP_ENV)
        const labels: { [k: string]: string } = {
            app_env: process.env.APP_ENV as string,
            docker_service_name: process.env.DOCKER_SERVICE_NAME as string,
            docker_node_host: process.env.DOCKER_NODE_HOST as string,
            docker_task_name: process.env.DOCKER_TASK_NAME as string,
            git_ci_run: buildInfo.GIT_CI_RUN as string,
            git_commit: buildInfo.GIT_COMMIT as string,
            node_type: 'api',
        }

        logger.write(logger.entry({
            severity:
                !res.statusCode ? 'ERROR' :
                    res.statusCode >= 200 && res.statusCode < 400 ? 'INFO' :
                        res.statusCode >= 400 && res.statusCode < 500 ? 'NOTICE' :
                            'ERROR',
            resource: {
                type: 'api',
                labels: {
                    service: serviceId,
                    method: res.locals.api_id,
                    ...(buildInfo?.version ? {
                        version: buildInfo?.version,
                    } : {}),
                },
            },
            labels: labels,
            httpRequest: {
                status: res.statusCode,
                requestUrl: req.url,
                requestSize: req.socket.bytesRead,
                requestMethod: req.method,
                userAgent: req.header('User-Agent'),
                latency: {
                    seconds: now[0],
                    nanos: now[1],
                },
                protocol: req.protocol,
            },
            trace: traceId ? 'projects/' + logProject + '/traces/' + traceId as string : undefined,
            spanId: spanId as string | undefined,
        }, {
            error: res.locals.error,
            error_stack: res.locals.error_stack,
        })).then(() => null).catch(() => null)
    })

    next()
})
app.use(AuthMiddleware)
app.use(express.json())
app.use(express.urlencoded({extended: true}))

routes.forEach(({id, method, path, handler, spec}) => {
    const routePath = spec && !spec.path ? OpenApiGen.pathToExpress(path, spec) : path
    const handle = handlerErrorWrapper(id, handler)
    method === GET && app.get(routePath, handle)
    method === PUT && app.put(routePath, handle)
    method === POST && app.post(routePath, handle)
    method === PATCH && app.patch(routePath, handle)
    method === DELETE && app.delete(routePath, handle)
})

// caching `30min`
app.use('/openapi.json', express.static(__dirname + '/openapi.json', {maxAge: 3600 / 2}))
app.use('/rapidoc', express.static(__dirname + '/lib/rapidoc', {maxAge: 3600 / 2}))
app.get('/docs', RapiDocHandler)

app.use(ErrorHandlerMiddleware)

// caching `3h`
//app.use('/', express.static(__dirname + '/demo', {maxAge: 3600 * 1000 * 3}))

export default app
