import fs from 'fs'
import path from 'path'
import { Liquid } from 'liquidjs'

export class DictionaryLoader {
    private locales: { [key: string]: any } = {}
    private readonly localeFolder: string
    private readonly ignoreMissing: boolean

    constructor(localeFolder: string, ignoreMissing: boolean = false) {
        this.localeFolder = localeFolder
        this.ignoreMissing = ignoreMissing
    }

    format(id: string, locale: string, fallback?: string): string {
        if(this.locales?.[locale]?.formats?.[id]) {
            return this.locales[locale].formats[id]
        }
        if(
            fallback &&
            this.locales?.[fallback]?.formats?.[id]
        ) {
            return this.locales[fallback].formats[id]
        }
        return ''
    }

    translate(text: string, locale: string, fallback?: string): any {
        if(this.locales?.[locale]?.translations?.[text]) {
            return this.locales[locale].translations[text]
        }
        if(
            fallback &&
            this.locales?.[fallback]?.translations?.[text]
        ) {
            return this.locales[fallback].translations[text]
        }
    }

    async loadLocale(locale: string): Promise<void> {
        if(!this.locales[locale]) {
            await new Promise<{ default: any }>((resolve, reject) => {
                fs.readFile(path.join(this.localeFolder, locale + '.json'), (err, buff) => {
                    if(err) {
                        reject(err)
                        return
                    }
                    resolve({default: JSON.parse(buff.toString())})
                })
            })
                .then(m => this.locales[locale] = m.default)
                .catch((e) => {
                    if(this.ignoreMissing) return
                    console.error('loadLocale failed for `' + locale + '` in folder `' + this.localeFolder + '`', e)
                })
        }
    }
}

export class LocalesDictionary {
    private readonly main: string
    private readonly fallback?: string
    private readonly dictionaries: DictionaryLoader[]
    private readonly liquid: Liquid
    private readonly liquidCache: { [k: string]: any } = {}

    constructor(
        main: string,
        fallback: string | undefined,
        liquid: Liquid,
        dictionaries: DictionaryLoader[],
    ) {
        this.main = main
        this.fallback = fallback
        this.liquid = liquid
        this.dictionaries = dictionaries
    }

    private findFormat(id: string, dictionaries: DictionaryLoader[]): string | undefined {
        const curDictionaries = [...dictionaries]
        const dic = curDictionaries.splice(0, 1)
        const res = dic[0] && dic[0]?.format(id, this.main, this.fallback)
        if(res) return res
        if(curDictionaries?.length) {
            return this.findFormat(id, curDictionaries)
        }
        console.error('format not found: `' + id + '` in `' + this.main + '` or `' + (this.fallback || 'no-fallback') + '`')
        return id
    }

    private findTranslation(text: string, dictionaries: DictionaryLoader[]): string | undefined {
        const curDictionaries = [...dictionaries]
        const dic = curDictionaries.splice(0, 1)
        const res = dic[0] && dic[0]?.translate(text, this.main, this.fallback)
        if(res) return res
        if(curDictionaries?.length) {
            return this.findTranslation(text, curDictionaries)
        }
        return text
    }

    format = (id: string): string | undefined => {
        return this.findFormat(id, this.dictionaries)
    }

    translate = (
        text: string,
        params?: { [k: string]: any },
    ): string | undefined => {
        let translated = this.findTranslation(text, this.dictionaries)
        if(typeof translated === 'string' && params) {
            if(!this.liquidCache[translated]) {
                this.liquidCache[translated] = this.liquid.parse(translated)
            }
            translated = this.liquid.renderSync(
                this.liquidCache[translated],
                params,
                {
                    globals: {},
                },
            )
        }
        return translated
    }
}

export class LocaleService {
    private dictionaries: { [key: string]: DictionaryLoader } = {}
    private readonly dictionaryGlobal: DictionaryLoader
    private readonly liquid: Liquid
    public readonly dictionaryGlobalPath: string

    constructor(dictionaryGlobalPath: string) {
        this.dictionaryGlobalPath = dictionaryGlobalPath
        this.dictionaryGlobal = new DictionaryLoader(dictionaryGlobalPath)
        this.liquid = new Liquid({
            cache: true,
        })
    }

    async getDictionary(pathRoot: string, template: string, locale: string, fallback?: string): Promise<LocalesDictionary> {
        if(!this.dictionaries[template]) {
            this.dictionaries[template] = new DictionaryLoader(
                path.join(pathRoot, template, 'locales'),
                true,
            )
        }
        await this.dictionaries[template].loadLocale(locale)
        await this.dictionaryGlobal.loadLocale(locale)
        if(fallback && locale !== fallback) {
            await this.dictionaries[template].loadLocale(fallback)
            await this.dictionaryGlobal.loadLocale(fallback)
        }
        return new LocalesDictionary(
            locale, fallback,
            this.liquid,
            [
                this.dictionaries[template],
                this.dictionaryGlobal,
            ],
        )
    }
}
