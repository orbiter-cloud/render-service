import { RouteHandler } from '@orbstation/route/RouteHandler'
import express from 'express'

export interface RequestCustomPayload extends express.Request {
    authId?: any
    trace?: string
}

export const handlerErrorWrapper = (id: string, fn: RouteHandler) => (req: express.Request, res: express.Response, next: express.NextFunction): Promise<RouteHandler> => {
    res.locals.api_id = id
    return fn(req, res).catch(next)
}
