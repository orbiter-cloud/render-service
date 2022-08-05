function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { routes } from './routes.js';
import { DELETE, GET, POST, PUT, PATCH } from '@orbstation/route/RouteDef';
import { handlerErrorWrapper } from './lib/routing.js';
import process from 'process';
import { getPerformanceInMs } from '@bemit/glog/performance';
import { LogManager } from '@bemit/glog/LogManager';
import boot from './boot.js';
import onHeaders from 'on-headers';
import { ServiceService } from './services.js';
import { AuthMiddleware } from './middleware/AuthMiddleware.js';
import { customAlphabet } from 'nanoid';
import { ErrorHandlerMiddleware } from '@orbstation/route/ErrorHandlerMiddleware';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
  logId,
  logProject,
  serviceId,
  buildInfo
} = boot();
const app = express();
app.use(function corsMiddleware(_req, res, next) {
  // using a custom cors middleware, as the `express.cors` isn't CDN compatible (doesn't send headers when not needed)
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', ['Content-Type', 'Cache-Control', 'Origin', 'Accept', 'Authorization', 'Audience', 'X-Cloud-Trace-Context', 'X-Performance'].join(', '));
  res.header('Access-Control-Expose-Headers', ['X-Cloud-Trace-Context', 'X-Trace-Id', 'X-Lb-Id', 'X-Performance'].join(', '));
  next();
});
const nanoTrace = customAlphabet('0123456789abcdefghijklmnopqrstuvwxqzABCDEFGHIJKLMNOPQRSTUVWXQZ', 32);
const nanoTraceSpan = customAlphabet('0123456789', 16);
app.use(function profilerMiddleware(req, res, next) {
  const startTime = process.hrtime();
  const traceId = req.header('X-Trace-Id') || req.header('X-Request-Id') || nanoTrace();
  const spanId = req.header('X-Trace-Id') ? req.header('X-Request-Id') : nanoTraceSpan();
  req.trace = traceId;
  onHeaders(res, function () {
    const now = process.hrtime(startTime);
    const dur = getPerformanceInMs(now);
    res.setHeader('X-Performance', dur);

    if (traceId) {
      res.setHeader('X-Trace-Id', traceId);
    }

    res.removeHeader('X-Powered-By');

    if (req.method === 'OPTIONS' && (res.statusCode === 200 || res.statusCode === 404) || req.method !== 'OPTIONS' && res.statusCode === 400) {
      return;
    }

    if (!ServiceService.config('googleLog')) {
      return;
    }

    const logManager = ServiceService.use(LogManager);
    const logger = logManager.getLogger(logId + '--' + process.env.APP_ENV);
    const labels = {
      app_env: process.env.APP_ENV,
      docker_service_name: process.env.DOCKER_SERVICE_NAME,
      docker_node_host: process.env.DOCKER_NODE_HOST,
      docker_task_name: process.env.DOCKER_TASK_NAME,
      git_ci_run: buildInfo.GIT_CI_RUN,
      git_commit: buildInfo.GIT_COMMIT,
      node_type: 'api'
    };
    logger.write(logger.entry({
      severity: !res.statusCode ? 'ERROR' : res.statusCode >= 200 && res.statusCode < 400 ? 'INFO' : res.statusCode >= 400 && res.statusCode < 500 ? 'NOTICE' : 'ERROR',
      resource: {
        type: 'api',
        labels: _objectSpread({
          service: serviceId,
          method: res.locals.api_id
        }, buildInfo !== null && buildInfo !== void 0 && buildInfo.version ? {
          version: buildInfo === null || buildInfo === void 0 ? void 0 : buildInfo.version
        } : {})
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
          nanos: now[1]
        },
        protocol: req.protocol
      },
      trace: traceId ? 'projects/' + logProject + '/traces/' + traceId : undefined,
      spanId: spanId
    }, {
      error: res.locals.error,
      error_stack: res.locals.error_stack
    })).then(() => null).catch(() => null);
  });
  next();
});
app.use(AuthMiddleware);
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
routes.forEach(({
  id,
  method,
  path,
  handler
}) => {
  const routePath = path; // const routePath = spec && !spec.path ? OpenApiGen.pathToExpress(path, spec) : path

  const handle = handlerErrorWrapper(id, handler);
  method === GET && app.get(routePath, handle);
  method === PUT && app.put(routePath, handle);
  method === POST && app.post(routePath, handle);
  method === PATCH && app.patch(routePath, handle);
  method === DELETE && app.delete(routePath, handle);
});
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: 3600 / 2,
  // caching `30min`
  index: false,
  // index: ['index.html'],
  extensions: ['html'],
  // fallthrough: false,// for debugging e.g. 404er
  redirect: false
}));
app.use(ErrorHandlerMiddleware);
export default app;