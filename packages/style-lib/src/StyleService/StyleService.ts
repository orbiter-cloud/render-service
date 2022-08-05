import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import nodeSass from 'node-sass'
import postcss from 'postcss'
import cssnano from 'cssnano'
import postcssImport from 'postcss-import'
import autoprefixer from 'autoprefixer'
import tildeImporter from 'node-sass-tilde-importer'

export class StyleService {
    protected readonly cacheExpire: number
    protected readonly cache: (
        cacheKey: string,
        onMiss: () => Promise<{
            value: string
            ex: number
            raw: any
        }>,
        onHit: (bufStr: any) => Promise<string>,
    ) => Promise<string | undefined>

    constructor(init: {
        cacheExpire?: number
        cache: (
            cacheKey: string,
            onMiss: () => Promise<{
                value: string
                ex: number
                raw: any
            }>,
            onHit: (bufStr: any) => Promise<string>,
        ) => Promise<string | undefined>
    }) {
        this.cacheExpire = init.cacheExpire || 500
        this.cache = init.cache
    }

    async buildCss(
        templatesRoot: string,
        templateRoot: string,
        style = 'main',
        vars: { [k: string]: string | number },
        options: {
            nanoCss?: boolean
            cssAutoPrefix?: boolean
        },
    ): Promise<string | undefined> {
        const cacheBuster = '_0'
        // const cacheBuster = new Date().getTime()
        const relStylePath = templateRoot + '/styles/' + style + '.scss'
        const fullStylePath = templatesRoot + '/' + relStylePath
        const scssVarStr = Object.keys(vars)
            .reduce(
                (styleVars, varKey) =>
                    styleVars + '$' + varKey + ': ' + vars[varKey] + ';\n', '',
            )
        const fileHash = crypto.createHash('sha256').update(fullStylePath).digest('hex')
        const scssVarHash = crypto.createHash('sha256').update(scssVarStr?.trim() || '-').digest('hex')
        const cacheKey = 'style:' + fileHash + cacheBuster + '.' + scssVarHash + 'nano-' + (options.nanoCss ? 'y' : 'n') + 'autop-' + (options.cssAutoPrefix ? 'y' : 'n')

        return await this.cache(
            cacheKey,
            () => {
                return new Promise<{
                    value: string
                    ex: number
                    raw: any
                }>((resolve, reject) => {
                    fs.readFile(fullStylePath, (err, sassSheet) => {
                        if(err) {
                            reject(new Error('node-sass failed to read sass file: ' + err.message))
                            return
                        }
                        nodeSass.render(
                            {
                                file: fullStylePath,
                                data: scssVarStr + '\n' + sassSheet.toString(),
                                importer: tildeImporter,
                                // outputStyle: 'nested',
                                includePaths: [
                                    path.resolve('node_modules'),
                                ],
                            },
                            (err, result) => {
                                if(err) {
                                    // todo: pass compile errors with infos back to api
                                    //console.log(err)
                                    reject(new Error('node-sass failed: ' + err.message))
                                    return
                                }
                                const cssBuff = result.css
                                postcss([
                                    postcssImport(),
                                    ...(options.cssAutoPrefix ? [autoprefixer()] : []),
                                    ...(options.nanoCss ? [cssnano()] : []),
                                ])
                                    .process(
                                        cssBuff,
                                        {
                                            from: relStylePath,
                                        },
                                    )
                                    .then(result => {
                                        resolve({
                                            value: result.css,
                                            ex: this.cacheExpire,
                                            raw: result.css,
                                        })
                                    })
                                    .catch((err) => {
                                        console.error('postcss', err)
                                        reject(new Error('postcss failed'))
                                    })
                            },
                        )
                    })
                })
            },
            (bufStr) => Promise.resolve(bufStr as string),
        )
    }

    async styleExists(templatesRoot: string, templateRoot: string, styleId: string) {
        return new Promise((resolve) => {
            fs.stat(templatesRoot + '/' + templateRoot + '/styles/' + styleId + '.scss', (err) => {
                if(err) {
                    resolve(false)
                    return
                }
                resolve(true)
            })
        })
    }
}
