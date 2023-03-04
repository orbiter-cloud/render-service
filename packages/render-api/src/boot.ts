import { LogManager } from '@bemit/glog/LogManager'
import { services } from './services.js'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import process from 'process'
import { LoggerGlobal } from '@bemit/glog/LoggerGlobal'
import preloadEnv from './config/preload/preloadEnv.js'
import preloadPackage from './config/preload/preloadPackage.js'
import preloadBuildInfo from './config/preload/preloadBuildInfo.js'
import { serviceFeatures } from './config/serviceFeatures.js'
import { OrbExtensions, OrbService, OrbServiceExtension } from '@orbstation/service'
import { basePath } from './routes.js'
import { RedisManager } from '@bemit/redis'
import { envIsTrue } from '@orbstation/service/envIs'

const __dirname = dirname(fileURLToPath(import.meta.url))

if(!envIsTrue(process.env.NO_DOTENV)) {
    preloadEnv(__dirname)
}
const packageJson = preloadPackage(__dirname)
const buildInfo = preloadBuildInfo(__dirname, packageJson)

export default async(nodeType?: 'api' | 'cli') => {
    serviceFeatures.parseFeatureConfig(process.env as { [k: string]: string })

    serviceFeatures.debugFeatures()

    // todo: unify `serviceConfig`, buildInfo, "service-meta inside of `logManager.serviceInfo`" inside of `OrbService`
    const service = new OrbService(
        {
            name: process.env.LOG_SERVICE_NAME as string,
            environment: process.env.APP_ENV as string,
            version: packageJson?.version || buildInfo?.GIT_COMMIT?.split('/')?.[2]?.slice(0, 6) || 'v0.0.1',
            buildNo: (buildInfo?.GIT_COMMIT ? buildInfo?.GIT_COMMIT + '.' : '') + (buildInfo?.GIT_CI_RUN || process.env.K_REVISION),
        },
        serviceFeatures,
    )

    const extensions = new OrbExtensions<OrbServiceExtension<{ service: typeof service, ServiceService: typeof ServiceService }>>([
        () => import('./features/oas/oas.feature.js').then(m => m.default({
            basePath: basePath,
            logo: undefined,
            serverSelect: envIsTrue(process.env.OA_SERVER_SELECT),
            serverUrl: process.env.OA_SERVER_URL,
        })),
    ])

    const ServiceService = services({
        service: service,
        isProd: process.env.NODE_ENV !== 'development',
        packageJson: packageJson,
        buildInfo: buildInfo,
    })

    const onHalt: (() => Promise<void>)[] = []

    if(service.features.enabled('gcp:log')) {
        const logManager = ServiceService.use(LogManager)
        const logger = logManager.getLogger(logManager.serviceInfo.logId)
        logManager.setLogger('default', logger)
        if(nodeType !== 'cli' && service.features.enabled('log:global')) {
            // todo: the logger should be closed as the last - not the first
            onHalt.push(
                LoggerGlobal(
                    logManager.getLogger('default'),
                    {
                        ...logManager.globalLabels,
                        node_type: nodeType + '.console',
                    }, undefined, {
                        service: logManager.serviceInfo.service as string,
                        version: logManager.serviceInfo.version as string,
                    },
                ),
            )
        }
    }

    // todo: add `onHalt` to extensions definition by default - or to `onBoot`?s
    await extensions.boot({service, ServiceService})
    onHalt.push(function closeRedis() {
        return ServiceService.use(RedisManager).quit()
    })

    return {service, extensions, ServiceService, onHalt}
}
