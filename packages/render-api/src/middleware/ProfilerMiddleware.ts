import { RouteMiddleware } from '@orbstation/route/RouteHandler'
import process from 'process'
import onHeaders from 'on-headers'
import { getPerformanceInMs } from '@bemit/glog/performance'
import { ServiceService } from '../services.js'
import { LogManager } from '@bemit/glog/LogManager'
import { customAlphabet } from 'nanoid'
import express from 'express'
import { RequestCustomPayload } from '../lib/routing.js'

export const ProfilerMiddleware = (
    {
        traceLength = 32,
        spanLength = 16,
        logRequest = false,
        noHeaderPerformance,
        setHeaderCloudContext,
        ignoreOptionsCodes = [200, 401, 404],
        headerPoweredBy = null,
        labelsDefault = {},
    }: {
        traceLength?: number
        spanLength?: number
        logRequest?: boolean
        noHeaderPerformance?: boolean
        setHeaderCloudContext?: boolean
        headerPoweredBy?: null | undefined | string
        ignoreOptionsCodes?: number[]
        labelsDefault?: { [k: string]: string }
    } = {},
): RouteMiddleware<express.Request & RequestCustomPayload> => {
    const nanoTrace = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', traceLength)
    const nanoTraceSpan = customAlphabet('0123456789', spanLength)

    return async(req, res, next) => {
        const startTime = process.hrtime()
        // todo: !! validate cross-infrastructure support / pluggable for GCP or HTZ deployments
        const [gTrace, gTraceSpan] = req.header('x-cloud-trace-context')?.split('/') || []
        const traceId: string = req.header('X-Trace-Id') || req.header('X-Request-Id') || gTrace || nanoTrace()
        const spanId = req.header('X-Trace-Id') ? req.header('X-Request-Id') : (gTraceSpan || nanoTraceSpan())
        req.trace = traceId as string
        onHeaders(res, function() {
            const now = process.hrtime(startTime)
            const dur = getPerformanceInMs(now)
            if(!noHeaderPerformance) {
                res.setHeader('X-Performance', dur)
            }
            if(setHeaderCloudContext && traceId) {
                res.setHeader('x-cloud-trace-context', traceId)
            } else {
                if(!gTrace && traceId) {
                    res.setHeader('X-Trace-Id', traceId)
                }
            }
            if(headerPoweredBy === null) {
                res.removeHeader('X-Powered-By')
            } else if(typeof headerPoweredBy === 'string') {
                res.setHeader('X-Powered-By', headerPoweredBy)
            }

            if(req.method === 'OPTIONS' && ignoreOptionsCodes.includes(res.statusCode)) {
                return
            }

            if(!logRequest) {
                return
            }

            const logManager = ServiceService.use(LogManager)
            const logger = logManager.getLogger('default')
            const labels: { [k: string]: string } = {
                ...logManager.globalLabels,
                ...labelsDefault,
                node_type: 'api',
            }
            // todo: use `LoggerApi`
            logger.write(logger.entry({
                severity:
                    !res.statusCode ? 'ERROR' :
                        res.statusCode >= 200 && res.statusCode < 400 ? 'INFO' :
                            res.statusCode >= 400 && res.statusCode < 500 ? 'NOTICE' :
                                'ERROR',
                resource: {
                    type: 'api',
                    labels: {
                        method: res.locals.api_id,
                        ...(logManager.serviceInfo.service ? {
                            service: logManager.serviceInfo.service,
                        } : {}),
                        ...(logManager.serviceInfo.version ? {
                            version: logManager.serviceInfo.version,
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
                trace: traceId ? logManager.makeTrace(traceId) : undefined,
                spanId: spanId as string | undefined,
            }, {
                error: res.locals.error,
                error_stack: res.locals.error_stack,
            }))
                .then(() => null)
                .catch((err) => {
                    console.error('ProfilerMiddleware failed to log', err)
                })
        })

        next()
    }
}
