import superagent, { SuperAgent, SuperAgentRequest } from 'superagent'

export interface TemplateRef {
    id: string
    fragment: string
}

export interface TemplateOptimize {
    // minify HTML
    minify?: boolean
    // remove unused CSS/CSS-Classes
    cleanCss?: boolean
    // css auto prefixer
    cssAutoPrefix?: boolean
    // nanocss optimizer
    nanoCss?: boolean
    // css IDs and class patterns to ignore for HTML cleanup
    cleanCssWhitelist?: string[]
    // if the css rules should be inlined to hte HTML tags
    inlineCss?: boolean
    // extra options for the html-minifier
    minifyHtmlOptions?: { [k: string]: any }
}

export class RenderClient {
    protected readonly optimizeInstructions: { [k: string]: () => TemplateOptimize }
    protected readonly backends: {
        default: string
        [id: string]: string
    }

    constructor(
        backends: {
            default: string
            [id: string]: string
        },
        optimizeInstructions: { [k: string]: () => TemplateOptimize },
    ) {
        this.backends = backends
        this.optimizeInstructions = optimizeInstructions
    }

    public tplRef(id: string, fragment: string): TemplateRef {
        return {id, fragment}
    }

    public optimize(contentType: string): TemplateOptimize {
        if(!this.optimizeInstructions[contentType]) {
            throw new Error('TemplateOptimize no instructions for ' + contentType)
        }
        return this.optimizeInstructions[contentType]()
    }

    static optimizeForHtml(): TemplateOptimize {
        return {
            minify: true,
            cssAutoPrefix: true,
            nanoCss: true,
            cleanCss: true,
            cleanCssWhitelist: [],
            inlineCss: false,
        }
    }

    static optimizeForEmail(): TemplateOptimize {
        return {
            minify: true,
            cssAutoPrefix: false,
            nanoCss: false,
            cleanCss: false,
            cleanCssWhitelist: [],
            minifyHtmlOptions: {
                html5: false,
                removeAttributeQuotes: false,
            },
            inlineCss: true,
        }
    }

    public apiClient(): SuperAgent<SuperAgentRequest> {
        return superagent
            .agent()
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .set('User-Agent', 'Orbito RenderClient; NodeJS')
    }

    public async render(
        renderer: string,
        locale: string,
        style: string,
        template: TemplateRef,
        optimize: TemplateOptimize,
        data: { [k: string]: any } = {},
        styleVars: { [k: string]: any } = {},
        options: {
            renderText?: boolean
            [k: string]: any
        } = {},
        trace ?: string,
    ): Promise<{
        id: string
        fragment: string
        // the rendered HTML
        rendered: string
        // TEXT semantically extracted from the rendered HTML
        renderedHTML?: string
        // duration in ms
        renderTime: number
        // detailed durations in ms
        timings?: {
            render: number
            styling: number
            optimize: number
            text: number
            prepare: number
            validate: number
        }
    }> {
        return await this.apiClient()
            .post(this.backends[renderer] + '/template/' + template.id + '/render/' + template.fragment)
            .set('X-Trace-Id', trace as string)
            .send({
                style: style,
                styleVars: styleVars,
                data: data,
                context: {
                    locale: locale,
                },
                optimize: optimize,
                ...options,
                renderText: options.renderText ?? false,
            })
            .then((r) => {
                if(r.statusCode === 200) {
                    return JSON.parse(r.text)
                }
                return Promise.reject(r)
            })
            .catch(e => {
                return Promise.reject(e)
            })
    }

    public async style(
        renderer: string,
        style: string,
        template: string,
        optimize: Pick<TemplateOptimize, 'nanoCss' | 'cssAutoPrefix'>,
        styleVars: { [k: string]: any } = {},
        trace?: string,
    ): Promise<{
        id: string
        styleId: string
        // the generated CSS
        style: string
        // duration in ms
        styleTime: number
        // detailed durations in ms
        timings?: {
            styling: number
            prepare: number
            validate: number
        }
    }> {
        return await this.apiClient()
            .post(this.backends[renderer] + '/template/' + template + '/style/' + style)
            .set('X-Trace-Id', trace as string)
            .send({
                styleVars: styleVars,
                optimize: optimize,
            })
            .then((r) => {
                if(r.statusCode === 200) {
                    return JSON.parse(r.text)
                }
                return Promise.reject(r)
            })
            .catch(e => {
                return Promise.reject(e)
            })
    }
}
