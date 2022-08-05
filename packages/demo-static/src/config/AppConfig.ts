import { ServiceConfig } from '../services.js'

export interface AppConfig {
    cdn_public_url: string
    cdn_bucket: string
    packageVersion: string
    buildInfo?: ServiceConfig['buildInfo']
    googleLog?: boolean
}
