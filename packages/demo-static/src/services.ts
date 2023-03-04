import process from 'process'
import path from 'path'
import { fileURLToPath } from 'url'
import { ServiceContainer } from 'service-service'
import { LogManager } from '@bemit/glog/LogManager'
import { envFileToAbsolute } from './lib/envFileToAbsolute.js'
import { SchemaService } from './service/SchemaService.js'
import { AppConfig } from './config/AppConfig.js'
import { CommandDispatcher } from '@orbstation/command/CommandDispatcher'
import { CommandResolverFolder } from '@orbstation/command/CommandResolverFolder'
import { RenderClient } from '@orbito/render-client/RenderClient'

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
        buildInfo, packageJson,
        serviceId, logId, logProject,
    } = serviceConfig
    ServiceService.configure('buildInfo', buildInfo)
    ServiceService.configure('packageVersion', packageJson?.version)

    ServiceService.define(SchemaService, [])
    if(process.env.GCP_LOG) {
        ServiceService.configure('googleLog', true)
        ServiceService.define(LogManager, [
            {
                keyFilename: envFileToAbsolute(process.env.GCP_LOG) as string,
            },
            {
                service: serviceId,
                logId: logId,
                logProject: logProject,
                app_env: process.env.APP_ENV,
                version: buildInfo?.version,
            },
        ])
    }
    ServiceService.define(CommandDispatcher, [{
        resolvers: [
            new CommandResolverFolder({folder: path.join(__dirname, 'commands')}),
        ],
    }])
    ServiceService.define(RenderClient, [{
        default: 'http://localhost:4264',
    }, {
        html: RenderClient.optimizeForHtml,
        email: RenderClient.optimizeForEmail,
    }])

    return serviceConfig as ServiceConfig
}
