function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import { LogManager } from '@bemit/glog/LogManager';
import fs from 'fs';
import { services, ServiceService } from './services.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import process from 'process';

const __dirname = dirname(fileURLToPath(import.meta.url));

let dotenvRes = dotenv.config({
  path: __dirname + '/.env'
});

if (dotenvRes.error) {
  if (dotenvRes.error.message.indexOf('ENOENT:') === 0) {
    dotenvRes = dotenv.config({
      path: dirname(__dirname) + '/.env'
    });
  }

  if (dotenvRes.error) {
    console.error('dotenvRes.error', dotenvRes.error);
    process.exit(1);
  }
}

export default (() => {
  let packageJson = {};

  try {
    packageJson = JSON.parse(fs.readFileSync(__dirname + '/package.json', 'utf8'));
  } catch (e) {
    try {
      packageJson = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8'));
    } catch (e) {// noop
    }
  }

  let buildInfo = {};

  try {
    var _packageJson, _packageJson2, _packageJson3;

    buildInfo = JSON.parse(fs.readFileSync(__dirname + '/build_info.json', 'utf8') || '{}');
    buildInfo = _objectSpread(_objectSpread({}, buildInfo), {}, {
      GIT_CI_RUN: process.env.GIT_CI_RUN || buildInfo.GIT_CI_RUN,
      GIT_COMMIT: process.env.GIT_COMMIT || buildInfo.GIT_COMMIT
    }, (_packageJson = packageJson) !== null && _packageJson !== void 0 && _packageJson.version ? {
      version: ((_packageJson2 = packageJson) === null || _packageJson2 === void 0 ? void 0 : _packageJson2.name) + '@v' + ((_packageJson3 = packageJson) === null || _packageJson3 === void 0 ? void 0 : _packageJson3.version)
    } : {});
  } catch (e) {
    var _packageJson4, _packageJson5, _packageJson6;

    // noop
    buildInfo = _objectSpread({
      GIT_CI_RUN: process.env.GIT_CI_RUN,
      GIT_COMMIT: process.env.GIT_COMMIT
    }, (_packageJson4 = packageJson) !== null && _packageJson4 !== void 0 && _packageJson4.version ? {
      version: ((_packageJson5 = packageJson) === null || _packageJson5 === void 0 ? void 0 : _packageJson5.name) + '@v' + ((_packageJson6 = packageJson) === null || _packageJson6 === void 0 ? void 0 : _packageJson6.version)
    } : {});
  }

  const serviceConfig = services({
    buildInfo,
    packageJson,
    isProd: process.env.NODE_ENV !== 'development',
    serviceId: process.env.LOG_SERVICE_NAME,
    logProject: process.env.LOG_PROJECT,
    logId: process.env.LOG_ID
  });

  if (process.env.NODE_ENV !== 'development' && ServiceService.config('googleLog')) {
    var _buildInfo, _buildInfo2, _buildInfo3;

    const logManager = ServiceService.use(LogManager);
    logManager.bindToGlobal(serviceConfig.serviceId, serviceConfig.logId + '--' + process.env.APP_ENV, (_buildInfo = buildInfo) === null || _buildInfo === void 0 ? void 0 : _buildInfo.version, {
      app_env: process.env.APP_ENV,
      docker_service_name: process.env.DOCKER_SERVICE_NAME,
      docker_node_host: process.env.DOCKER_NODE_HOST,
      docker_task_name: process.env.DOCKER_TASK_NAME,
      git_ci_run: (_buildInfo2 = buildInfo) === null || _buildInfo2 === void 0 ? void 0 : _buildInfo2.GIT_CI_RUN,
      git_commit: (_buildInfo3 = buildInfo) === null || _buildInfo3 === void 0 ? void 0 : _buildInfo3.GIT_COMMIT,
      node_type: 'global.console'
    });
  }

  return serviceConfig;
});