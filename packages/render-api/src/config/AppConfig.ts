export interface AppConfig {
    host: string
    basePath: string
    cdn_public_url: string
    cdn_bucket: string
    buildInfo: { [k: string]: string }
    accessConfig?: {
        publicRenderApi?: boolean
        publicDescribeApi?: boolean
    }
}
