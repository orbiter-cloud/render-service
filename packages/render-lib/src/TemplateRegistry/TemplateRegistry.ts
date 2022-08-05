import fs from 'fs'
import path from 'path'

export interface TemplateLayouts {
    label: string
    order?: number
    // root
    roots: {
        [key: string]: {
            // key-ids of allowed blocks define which the user can add on his own
            blocksAllowed?: string[]
            // key-ids of forced blocks define which must be added to this root
            blocksForced?: string[]
            // free-text tags for e.g. telling "blocks that can be used in a (sidebar, footer, teaser, sub-grid)" etc.
            tags?: string[]
        }
    }
    // relative path to config file incl. extension
    configSchema?: string
}

export interface TemplateConfig {
    name: string
    version: string
    global?: {
        metaSchema?: string
        blocks?: {
            [key: string]: {
                order?: number
            }
        }
    }
    // the distributions supported by the template
    supports: string[]
    layouts: {
        [key: string]: TemplateLayouts
    }
    'document-types': {
        [key: string]: {
            label: string
            desc: string
            meta: string
            schema: any
            sections?: string[]
        }
    }
}

export class TemplateRegistry {
    public readonly templatePathRoot: string
    protected templateConfigs: { [key: string]: TemplateConfig } = {}

    constructor(templatePathRoot: string) {
        this.templatePathRoot = templatePathRoot
    }

    async templateExists(templateRoot: string, fragment: string) {
        return new Promise((resolve) => {
            fs.stat(path.join(this.templatePathRoot, templateRoot, fragment), (err) => {
                if(err) {
                    resolve(false)
                    return
                }
                resolve(true)
            })
        })
    }

    async getConfig(id: string): Promise<TemplateConfig | null> {
        if(!this.templateConfigs[id]) {
            const templateExists = await this.exists(id)
            if(!templateExists) {
                return null
            }
            await new Promise<{ default: any }>((resolve, reject) => {
                fs.readFile(this.getTemplateConfigPath(id), (err, buff) => {
                    if(err) {
                        reject(err)
                        return
                    }
                    resolve({default: JSON.parse(buff.toString())})
                })
            })
                .then(config => this.templateConfigs[id] = config.default)
                .catch((e) => {
                    console.error('TemplateRegistry.getConfig error', e)
                    return null
                })
        }
        return this.templateConfigs[id] || null
    }

    protected getTemplateConfigPath(id: string): string {
        return path.join(this.templatePathRoot as string, id, 'config.json')
    }

    async exists(id: string): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            fs.stat(this.getTemplateConfigPath(id), (err) => {
                if(err) {
                    resolve(false)
                    return
                }
                resolve(true)
            })
        })
    }

    async getDocTypeMetaSchema(id: string, type: string): Promise<any | null> {
        const template = await this.getConfig(id)
        const typeInfo = template?.['document-types'][type]
        if(!typeInfo?.meta) return Promise.resolve(null)
        return await new Promise<{ default: any }>((resolve, reject) => {
            fs.readFile(path.resolve(this.templatePathRoot as string, id, typeInfo.meta), (err, buff) => {
                if(err) {
                    reject(err)
                    return
                }
                resolve({default: JSON.parse(buff.toString())})
            })
        })
            .then(config => config.default)
            .catch((e) => {
                console.error('TemplateRegistry.getDocTypeMetaSchema error', e)
                return null
            })
    }
}
