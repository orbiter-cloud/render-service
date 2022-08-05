import process from 'process';
import path from 'path';
import { fileURLToPath } from 'url';
import { ServiceContainer } from 'service-service';
import { LogManager } from '@bemit/glog/LogManager';
import { IdManager } from '@bemit/cloud-id/IdManager';
import { RedisManager } from '@bemit/redis/RedisManager';
import { RedisCached } from '@bemit/redis/RedisCached';
import { envFileToAbsolute } from './lib/envFileToAbsolute.js';
import { SchemaService } from './service/SchemaService.js';
import { CommandDispatcher } from '@orbstation/command/CommandDispatcher';
import { CommandResolverFolder } from '@orbstation/command/CommandResolverFolder';
import { RenderClient } from '@orbito/render-client/RenderClient';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ServiceService = new ServiceContainer();
export const services = serviceConfig => {
  const {
    isProd,
    buildInfo,
    packageJson
  } = serviceConfig;
  ServiceService.configure('buildInfo', buildInfo);
  ServiceService.configure('packageVersion', packageJson === null || packageJson === void 0 ? void 0 : packageJson.version);
  const envIdKeyUrl = process.env.ID_KEY_URL;
  const envIdKeyMem = process.env.ID_KEY_MEM;
  let idValidation;

  if (envIdKeyMem && envIdKeyUrl) {
    throw new Error('setup failed, `ID_KEY_URL` and `ID_KEY_MEM` can not be used concurrently');
  } else if (envIdKeyMem) {
    idValidation = {
      type: 'memory-key',
      keyMem: envIdKeyMem,
      issuer: process.env.ID_ISSUER,
      audience: process.env.ID_AUDIENCE,
      algorithms: process.env.ID_KEY_ALGO ? process.env.ID_KEY_ALGO.split(',') : undefined
    };
  } else if (envIdKeyUrl) {
    idValidation = {
      type: 'load-key',
      keyUrl: envIdKeyUrl,
      issuer: process.env.ID_ISSUER,
      audience: process.env.ID_AUDIENCE,
      algorithms: process.env.ID_KEY_ALGO ? process.env.ID_KEY_ALGO.split(',') : undefined
    };
  }

  ServiceService.define(IdManager, [{
    host: process.env.ID_HOST,
    validation: idValidation,
    cacheExpire: 60 * (isProd ? 60 * 6 : 15),
    cacheExpireMemory: 60 * 5,
    redisManager: () => ServiceService.use(RedisManager)
  }]);
  ServiceService.define(SchemaService, []);

  if (process.env.GCP_LOG) {
    ServiceService.configure('googleLog', true);
    ServiceService.define(LogManager, [{
      keyFilename: envFileToAbsolute(process.env.GCP_LOG)
    }]);
  }

  ServiceService.define(RedisManager, [{
    url: 'redis://' + process.env.REDIS_HOST,
    database: 6
  }]);
  ServiceService.define(RedisCached, () => [new RedisManager({
    url: 'redis://' + process.env.REDIS_HOST,
    database: 7
  })]);
  ServiceService.define(CommandDispatcher, [{
    resolvers: [new CommandResolverFolder({
      folder: path.join(__dirname, 'commands')
    })]
  }]);
  ServiceService.define(RenderClient, [{
    default: 'http://localhost:4264'
  }, {
    html: RenderClient.optimizeForHtml,
    email: RenderClient.optimizeForEmail
  }]);
  return serviceConfig;
};