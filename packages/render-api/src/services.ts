import process from 'process'
import path from 'path'
import { fileURLToPath } from 'url'
import { ServiceContainer } from 'service-service'
import { LogManager } from '@bemit/glog/LogManager'
import { IdManager, IdValidationStrategy } from '@bemit/cloud-id/IdManager'
import { RedisManager } from '@bemit/redis/RedisManager'
import { RedisCached } from '@bemit/redis/RedisCached'
import { TemplateRegistry } from '@orbito/render/TemplateRegistry'
import { TemplateService } from '@orbito/render/TemplateService'
import { StyleService } from '@orbito/style/StyleService'
import { envFileToAbsolute } from './lib/envFileToAbsolute.js'
import { envIsTrue } from './lib/envIsTrue.js'
import { SchemaService } from './service/SchemaService.js'
import { AppConfig } from './config/AppConfig.js'
import { TemplateOptimizeService } from './service/TemplateOptimizeService.js'
import { LocaleService } from '@orbito/render/LocaleService'
import { CommandDispatcher } from '@orbstation/command/CommandDispatcher'
import { CommandResolverFolder } from '@orbstation/command/CommandResolverFolder'
import { twigFilters } from './Twig/TwigFilters.js'
import { twigFunctions } from './Twig/TwigFunctions.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const ServiceService = new ServiceContainer<AppConfig>()

export interface ServiceConfig {
    buildInfo: { [k: string]: string }
    packageJson: { [k: string]: string }
    isProd?: boolean
    serviceId: string
    logId: string
    logProject: string
}

export const services = (serviceConfig: ServiceConfig): ServiceConfig => {
    const {
        isProd, buildInfo, packageJson,
    } = serviceConfig
    ServiceService.configure('buildInfo', buildInfo)
    ServiceService.configure('accessConfig', {
        publicRenderApi: envIsTrue(process.env.ACCESS_PUBLIC_RENDER),
        publicDescribeApi: envIsTrue(process.env.ACCESS_PUBLIC_DESCRIBE),
    })
    ServiceService.configure('packageVersion', packageJson?.version)

    const envIdKeyUrl = process.env.ID_KEY_URL
    const envIdKeyMem = process.env.ID_KEY_MEM
    let idValidation: undefined | IdValidationStrategy
    if(envIdKeyMem && envIdKeyUrl) {
        throw new Error('setup failed, `ID_KEY_URL` and `ID_KEY_MEM` can not be used concurrently')
    } else if(envIdKeyMem) {
        idValidation = {
            type: 'memory-key',
            keyMem: envIdKeyMem,
            issuer: process.env.ID_ISSUER as string,
            audience: process.env.ID_AUDIENCE as string | undefined,
            algorithms: process.env.ID_KEY_ALGO ? process.env.ID_KEY_ALGO.split(',') : undefined,
        }
    } else if(envIdKeyUrl) {
        idValidation = {
            type: 'load-key',
            keyUrl: envIdKeyUrl,
            issuer: process.env.ID_ISSUER as string,
            audience: process.env.ID_AUDIENCE as string | undefined,
            algorithms: process.env.ID_KEY_ALGO ? process.env.ID_KEY_ALGO.split(',') : undefined,
        }
    }

    ServiceService.define(IdManager, [{
        host: process.env.ID_HOST as string | undefined,
        validation: idValidation,
        cacheExpire: 60 * (isProd ? 60 * 6 : 15),
        cacheExpireMemory: 60 * 5,
        redisManager: () => ServiceService.use(RedisManager),
    }])

    ServiceService.define(TemplateRegistry, [path.join(__dirname, '../', 'templates')])
    ServiceService.define(TemplateService, [
        twigFunctions,
        twigFilters,
    ])
    ServiceService.define(TemplateOptimizeService, [])
    ServiceService.define(LocaleService, [path.join(__dirname, '../', 'locales')])
    ServiceService.define(SchemaService, [])
    if(process.env.GCP_LOG) {
        ServiceService.configure('googleLog', true)
        ServiceService.define(LogManager, [{
            keyFilename: envFileToAbsolute(process.env.GCP_LOG) as string,
        }])
    }
    ServiceService.define(RedisManager, [{
        url: 'redis://' + process.env.REDIS_HOST,
        database: 6,
    }])
    ServiceService.define(RedisCached, () => [new RedisManager({
        url: 'redis://' + process.env.REDIS_HOST,
        database: 7,
    })] as [RedisManager])
    ServiceService.define(StyleService, [{
        cacheExpire: process.env.CACHE_EX_STYLE ? Number(process.env.CACHE_EX_STYLE) : 500,
        cache: (...params) => ServiceService.use(RedisCached).cache(...params)
    }])
    ServiceService.define(CommandDispatcher, [{
        resolvers: [
            new CommandResolverFolder({folder: path.join(__dirname, 'commands')}),
        ],
    }])

    return serviceConfig as ServiceConfig
}
