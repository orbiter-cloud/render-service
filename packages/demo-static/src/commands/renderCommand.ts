import { RenderClient } from '@orbito/render-client/RenderClient'
import { CommandHandler } from '@orbstation/command/CommandHandler'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ServiceService } from '../services.js'
import watch from 'node-watch'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const levelToSpace = (level: number) => Array(level).fill(null).map(() => '  ').join('')
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
const fsWrite = (path: string, data: string, level: number = 0) => new Promise<undefined>((resolve, reject) => {
    fs.writeFile(path, data, (err) => {
        if(err) {
            console.error(levelToSpace(level) + ' ✘ failed to write file: ' + path, err)
            reject(err)
            return
        }
        console.log(levelToSpace(level) + ' > written file: ' + path)
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
const fsReadDir = (path: string) => new Promise<string[]>((resolve, reject) => {
    fs.readdir(path, (err, buff) => {
        if(err) {
            console.error(' ✘ failed to read dir: ' + path, err)
            reject(err)
            return
        }
        resolve(buff)
    })
})
export const renderCommand: CommandHandler['run'] = async(_c, args, commandRun) => {
    const renderClient = ServiceService.use(RenderClient)
    const doWatch = args.includes('-w') || args.includes('--watch')

    const dataDir = path.join(__dirname, '../', 'data')
    const dataFiles = await fsReadDir(dataDir)
    console.log(' > rendering ' + dataFiles.length + ' pages')

    await fsMkDir(path.join(__dirname, '../', 'dist'))

    const renderFile = async(file: string) => {
        const htmlFile = file.slice(0, file.length - '.json'.length) + '.html'
        const dataFileContent = JSON.parse(await fsRead(path.join(dataDir, file)))
        const res = await renderClient.render(
            'default', 'en', 'main',
            renderClient.tplRef('demo', 'pages/default'),
            renderClient.optimize('html'),
            dataFileContent,
            {},
            {},
            commandRun.runId,
        )
        console.log('   > rendered template in ' + res.renderTime + 'ms')

        const html = res.rendered
        await fsWrite(path.join(__dirname, '../', 'dist', htmlFile), html, 1)
        console.log('   > written output: ' + htmlFile)
    }

    const renderStyle = async(styleId: string) => {
        const res = await renderClient.style(
            'default', styleId, 'demo',
            {nanoCss: true, cssAutoPrefix: true},
            {},
            commandRun.runId,
        )
        console.log('   > rendered style in ' + res.styleTime + 'ms')

        const style = res.style
        await fsWrite(path.join(__dirname, '../', 'dist', styleId + '.css'), style, 1)
        console.log('   > written output: ' + styleId + '.css')
    }

    for(const dataFile of dataFiles) {
        console.log(' > rendering: ' + dataFile)
        await renderFile(dataFile)
    }

    console.log(' ✔ rendered templates')

    await renderStyle('main')

    if(doWatch) {
        const watcher = watch(dataDir, {recursive: true}, function(_evt, name) {
            const relName = name.slice(dataDir.length + 1)
            console.log(' > change, rendering: ' + relName)
            renderFile(relName)
                .then(() => {
                    // noop
                })
                .catch((e) => {
                    console.error(e)
                })
        })
        commandRun.onHalt(() => watcher.close())
    }
}

export const command: CommandHandler = {
    help: `Renders all data with templates.`,
    run: renderCommand,
}
