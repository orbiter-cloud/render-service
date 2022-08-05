import path from 'path'
import { makeTwig } from './makeTwig.js'

export interface DocumentBuildDocument {
    [k: string]: any
}

export interface DocumentBuildContext {
    // id: number
    locale: string
    // layout: string
    // status: string
    // store: Object
    // created: { date: string, timezone_type: number, timezone: string }
}

export interface TwigFunction {
    // name of function
    name: string
    // the actual implementation
    func: Function
}

export interface TwigUserLandParams {
    path?: string
    base?: string
    name?: string
    href?: string
    data?: string
    ref?: any // todo: name stricter
    namespaces?: {
        // todo: check if `string[]` namespaces work
        [id: string]: string
    }
}

export interface TwigParams {
    id?: string
    parser?: string
    strict_variables?: boolean
    autoescape?: boolean
    allowInlineIncludes?: boolean
    rethrow?: boolean
    debug?: boolean
    trace?: any // todo: name stricter
    module?: any // todo: name stricter
    method?: any // todo: name stricter
    precompiled?: any // todo: name stricter
    load?: any // todo: name stricter
    error?: any // todo: name stricter
    async?: boolean // todo: check typing
}

export class TemplateService {
    private readonly twig: (params: TwigParams & TwigUserLandParams) => void
    private readonly functionsFactory: (templateRoot: string, locale: string) => Promise<TwigFunction[]>

    constructor(
        functionsFactory: (templateRoot: string, locale: string) => Promise<TwigFunction[]>,
        filtersFactory: () => TwigFunction[],
    ) {
        this.functionsFactory = functionsFactory
        // @ts-ignore
        this.twig = makeTwig({filters: filtersFactory()}).exports.twig
    }

    async render(
        templateRoot: string,
        template: string,
        fragment: string,
        style = 'main',
        document: DocumentBuildDocument,
        context: DocumentBuildContext,
    ) {
        const base = path.join(templateRoot, template)
        const data = {
            doc: document,
            ctx: context,
            styleId: style,
            // todo: real absolute urls from API
            //links: {canonical: 'http://localhost:3000/bemit/orbiter/collections/1/1/en/preview'},
        }
        const ctxPlugins = await this.functionsFactory(template, context.locale)
        return new Promise<any>((resolve, reject) => {
            this.innerRender(
                {
                    path: path.join(base, fragment),
                    base: base,

                }, {
                    strict_variables: false,
                    async: true,
                    // cache: true,
                },
                ctxPlugins.reduce((ctx, plg) => ({
                    ...ctx,
                    [plg.name]: plg.func,
                }), {
                    ...data,
                    locale: context.locale,
                }),
                (err, html) => {
                    if(err) {
                        reject(err)
                        return
                    }
                    resolve(html)
                },
            )
        })
    }

    private innerRender(
        tplParams: TwigUserLandParams,
        systemParams: Omit<TwigParams, 'load' | 'error'>,
        contextData: any,
        fn: (err, html?: any) => void,
    ) {
        const params: TwigParams & TwigUserLandParams = {
            ...tplParams,
            ...systemParams,
            load(template) {
                template.renderAsync(
                    contextData,
                    // todo: check what these params do, vs. those provides to `twig()`
                    /*{
                        blocks: undefined,
                        // isInclude: false,
                    },*/
                )
                    .then(out => fn(null, out), fn)
            },
            error(err) {
                fn(err)
            },
        }

        this.twig(params)
    }
}
