import { LocaleService } from '@orbito/render/LocaleService'
import { TemplateRegistry } from '@orbito/render/TemplateRegistry'
import { CommandHandler } from '@orbstation/command/CommandHandler'
import fs, { Stats } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ServiceService } from '../services.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const fsStats = path => new Promise<Stats | undefined>((resolve, reject) => {
    fs.stat(path, (err, stats) => {
        if(err) {
            if(err.code === 'ENOENT') {
                resolve(undefined)
                return
            }
            reject(err)
            return
        }
        resolve(stats)
    })
})
const fsMkDir = (path: string) => new Promise<undefined>((resolve, reject) => {
    fs.mkdir(path, {recursive: true}, (err) => {
        if(err) {
            console.error(' ✘ failed to create folder: ' + path, err)
            reject(err)
            return
        }
        console.log(' > created folder: ' + path)
        resolve(undefined)
    })
})
const fsWrite = (path: string, data: string) => new Promise<undefined>((resolve, reject) => {
    fs.writeFile(path, data, (err) => {
        if(err) {
            console.error(' ✘ failed to write file: ' + path, err)
            reject(err)
            return
        }
        console.log(' > written file: ' + path)
        resolve(undefined)
    })
})
const fsRead = (path: string) => new Promise<string>((resolve, reject) => {
    fs.readFile(path, (err, buff) => {
        if(err) {
            console.error(' ✘ failed to read file: ' + path, err)
            reject(err)
            return
        }
        resolve(buff.toString())
    })
})
export const tplInitCommand: CommandHandler['run'] = async(_c, args) => {
    const [tplId, locale = 'en', style = 'main'] = args
    if(!tplId) {
        throw new Error('requires arg: tplId')
    }
    const localeService = ServiceService.use(LocaleService)
    const templateRegistry = ServiceService.use(TemplateRegistry)
    const tplPath = path.join(templateRegistry.templatePathRoot, tplId)
    const exists = await fsStats(tplPath)
    if(exists) {
        throw new Error('template already exists at ' + tplPath)
    }
    console.log('creating template `' + tplId + '`... target: ' + tplPath)
    await Promise.all([
        fsMkDir(path.join(tplPath, 'locales')),
        fsMkDir(path.join(tplPath, 'styles')),
        fsMkDir(path.join(tplPath, 'pages')),
    ])
    const localeDefault = {
        formats: {},
        translations: {},
    }
    await Promise.all([
        fsWrite(path.join(tplPath, 'locales', locale + '.json'), JSON.stringify(localeDefault, undefined, 4)),
    ])
    const globalLocalePath = path.join(localeService.dictionaryGlobalPath, locale + '.json')
    const existsGlobalLocale = await fsStats(globalLocalePath)
    if(!existsGlobalLocale) {
        await fsWrite(globalLocalePath, JSON.stringify(localeDefault, undefined, 4))
    }
    const templateStructurePath = path.join(__dirname, '../', 'lib', 'structure')
    const structMainScss = await fsRead(path.join(templateStructurePath, 'main.scss'))
    await fsWrite(path.join(tplPath, 'styles', style + '.scss'), structMainScss)

    const structMainTwig = await fsRead(path.join(templateStructurePath, '_main.twig'))
    await fsWrite(path.join(tplPath, '_main.twig'), structMainTwig)
    const structBaseTwig = await fsRead(path.join(templateStructurePath, '_base.twig'))
    await fsWrite(path.join(tplPath, '_base.twig'), structBaseTwig)

    const structPageDefault = await fsRead(path.join(templateStructurePath, 'page_default.twig'))
    await fsWrite(path.join(tplPath, 'pages', 'default.twig'), structPageDefault.replace(/%tpl-root%/g, '&lt;templates&gt;/' + tplId + '/pages/default.twig'))

    const structConfigStr = await fsRead(path.join(templateStructurePath, 'config.json'))
    const structConfigData = JSON.parse(structConfigStr) as any
    structConfigData.name = 'Template ' + tplId
    structConfigData.description = 'created at ' + new Date().toLocaleString()
    await fsWrite(path.join(tplPath, 'config.json'), JSON.stringify(structConfigData, undefined, 4))

    console.log(' ✔ created new template `' + tplId + '` in ' + tplPath)
}

export const command: CommandHandler = {
    help: `Creates a new template folder, with basic folder and file structure`,
    run: tplInitCommand,
}
