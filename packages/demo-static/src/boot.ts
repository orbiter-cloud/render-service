import { LogManager } from '@bemit/glog/LogManager'
import fs from 'fs'
import { ServiceConfig, services, ServiceService } from './services.js'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import process from 'process'

const __dirname = dirname(fileURLToPath(import.meta.url))

let dotenvRes = dotenv.config({
    path: __dirname + '/.env',
})

if(dotenvRes.error) {
    if(dotenvRes.error.message.indexOf('ENOENT:') === 0) {
        dotenvRes = dotenv.config({
            path: dirname(__dirname) + '/.env',
        })
    }
    if(dotenvRes.error) {
        console.error('dotenvRes.error', dotenvRes.error)
        process.exit(1)
    }
}

export default (): ServiceConfig => {
    let packageJson: { [k: string]: string } = {}
    try {
        packageJson = JSON.parse(fs.readFileSync(__dirname + '/package.json', 'utf8'))
    } catch(e) {
        try {
            packageJson = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8'))
        } catch(e) {
            // noop
        }
    }

    let buildInfo: { [k: string]: string } = {}
    try {
        buildInfo = JSON.parse(fs.readFileSync(__dirname + '/build_info.json', 'utf8') || '{}')
        buildInfo = {
            ...buildInfo,
            GIT_CI_RUN: process.env.GIT_CI_RUN || buildInfo.GIT_CI_RUN,
            GIT_COMMIT: process.env.GIT_COMMIT || buildInfo.GIT_COMMIT,
            ...(packageJson?.version ? {
                version: packageJson?.name + '@v' + packageJson?.version,
            } : {}),
        }
    } catch(e) {
        // noop
        buildInfo = {
            GIT_CI_RUN: process.env.GIT_CI_RUN as string,
            GIT_COMMIT: process.env.GIT_COMMIT as string,
            ...(packageJson?.version ? {
                version: packageJson?.name + '@v' + packageJson?.version,
            } : {}),
        }
    }

    const serviceConfig = services({
        buildInfo,
        packageJson,
        isProd: process.env.NODE_ENV !== 'development',
        serviceId: process.env.LOG_SERVICE_NAME as string,
        logProject: process.env.LOG_PROJECT as string,
        logId: process.env.LOG_ID as string,
    })
    if(process.env.NODE_ENV !== 'development' && ServiceService.config('googleLog')) {
        const logManager = ServiceService.use(LogManager)
        logManager.bindToGlobal(serviceConfig.serviceId, serviceConfig.logId + '--' + process.env.APP_ENV, buildInfo?.version, {
            app_env: process.env.APP_ENV as string,
            docker_service_name: process.env.DOCKER_SERVICE_NAME as string,
            docker_node_host: process.env.DOCKER_NODE_HOST as string,
            docker_task_name: process.env.DOCKER_TASK_NAME as string,
            git_ci_run: buildInfo?.GIT_CI_RUN as string,
            git_commit: buildInfo?.GIT_COMMIT as string,
            node_type: 'global.console',
        })
    }
    return serviceConfig
}
