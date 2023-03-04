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
import { OrbService, OrbServiceFeature, OrbServiceFeatures } from '@orbstation/service'
import { OpenApiApp } from '@orbstation/oas/OpenApiApp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const ServiceService = new ServiceContainer<AppConfig>()

export interface ServiceConfig {
    isProd?: boolean
    buildInfo: AppConfig['buildInfo']
    packageJson: { name?: string, version?: string, [k: string]: unknown }
    service: OrbService<OrbServiceFeatures<{ 'gcp:log': OrbServiceFeature }>>
}

export const services = (serviceConfig: ServiceConfig) => {
    const {buildInfo, service, isProd} = serviceConfig

    ServiceService.configure('host', process.env.HOST || ('http://localhost:' + (process.env.PORT || 3000)))
    // todo: add support for env-vars and refactor routes setup to use it
    ServiceService.configure('basePath', '')
    ServiceService.configure('buildInfo', buildInfo)
    ServiceService.configure('accessConfig', {
        publicRenderApi: envIsTrue(process.env.ACCESS_PUBLIC_RENDER),
        publicDescribeApi: envIsTrue(process.env.ACCESS_PUBLIC_DESCRIBE),
    })

    ServiceService.define(OpenApiApp, (): ConstructorParameters<typeof OpenApiApp> => [
        {
            title: 'Render-Service',
            description: 'API docs of a [Orbito Render](https://github.com/orbiter-cloud/render-service) service.',
            version: service.version || service.buildNo,
            license: {name: 'MIT'},
        },
        [],
        {
            servers: [
                {
                    url: ServiceService.config('host'),
                    description: 'local dev server',
                    variables: {},
                },
            ],
        },
    ])

    ServiceService.define(RedisManager, (): ConstructorParameters<typeof RedisManager> => [[
        RedisManager.define('store', {
            url: 'redis://' + process.env.REDIS_HOST,
            database: typeof process.env.REDIS_DB_STORE !== 'undefined' ? Number(process.env.REDIS_DB_STORE) : 0,
        })
            .on('error', (err) => console.log('Redis Client Error', err)),
        RedisManager.define('id-cache', {
            url: 'redis://' + process.env.REDIS_HOST,
            database: typeof process.env.REDIS_DB_CACHE !== 'undefined' ? Number(process.env.REDIS_DB_CACHE) : 0,
        })
            .on('error', (err) => console.log('Redis Client Error', err)),
    ]])
    ServiceService.define(
        RedisCached,
        (): ConstructorParameters<typeof RedisCached> =>
            [ServiceService.use(RedisManager).connection('store')],
    )

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

    ServiceService.define(IdManager, (): ConstructorParameters<typeof IdManager> => [{
        host: process.env.ID_HOST as string | undefined,
        validation: idValidation,
        cacheExpire: 60 * (isProd ? 60 * 6 : 15),
        cacheExpireMemory: 60 * 5,
        redis: ServiceService.use(RedisManager).connection('id-cache'),
    }])

    ServiceService.define(TemplateRegistry, [path.join(__dirname, '../', 'templates')])
    ServiceService.define(TemplateService, [
        twigFunctions,
        twigFilters,
    ])
    ServiceService.define(TemplateOptimizeService, [])
    ServiceService.define(LocaleService, [path.join(__dirname, '../', 'locales')])
    ServiceService.define(SchemaService, [])

    if(service.features.enabled('gcp:log')) {
        ServiceService.define(LogManager, [
            {
                keyFilename: envFileToAbsolute(process.env.GCP_LOG) as string,
            },
            {
                service: service.name,
                version: service.version,
                logId: process.env.LOG_ID + '--' + service.environment,
                logProject: process.env.LOG_PROJECT as string,
            },
            {
                app_env: service.environment,
                ...service.buildNo ? {
                    build_no: service.buildNo,
                } : {},
                docker_service_name: process.env.DOCKER_SERVICE_NAME as string,
                docker_node_host: process.env.DOCKER_NODE_HOST as string,
                docker_task_name: process.env.DOCKER_TASK_NAME as string,
            },
        ])
    }
    ServiceService.define(StyleService, [{
        cacheExpire: process.env.CACHE_EX_STYLE ? Number(process.env.CACHE_EX_STYLE) : 500,
        cache: (...params) => ServiceService.use(RedisCached).cache(...params),
    }])
    ServiceService.define(CommandDispatcher as typeof CommandDispatcher<undefined>, [{
        resolver: [
            new CommandResolverFolder({folder: path.join(__dirname, 'commands')}),
        ],
    }])

    return ServiceService
}
