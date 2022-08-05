import { minify as htmlmin, Options as HtmlMinifierOptions } from 'html-minifier'
import { comb } from 'email-comb'
import inlineCss from 'inline-css'
import cheerio from 'cheerio'

export class TemplateOptimizeService {
    cleanStyling(html: string, cleanInlineCSSOptions, cleanInlineCSSWhitelist): string {
        return comb(html, cleanInlineCSSOptions || {
            whitelist: cleanInlineCSSWhitelist,
        }).result
    }

    minifyHtml(html: string, minifyHtmlOptions: HtmlMinifierOptions) {
        return htmlmin(html, minifyHtmlOptions || {
            collapseBooleanAttributes: true,
            collapseInlineTagWhitespace: false,
            collapseWhitespace: true,
            decodeEntities: true,
            removeAttributeQuotes: true,
        })
    }

    async inlineStyling(html: string): Promise<string> {
        return new Promise((resolve, reject) => {
            inlineCss(html, {
                url: 'none',
                preserveMediaQueries: true,
                // todo: add as config option
                removeHtmlSelectors: true,
            })
                .then((html) => {
                    resolve(html)
                })
                .catch((e) => {
                    console.error('TwigBuilder.buildHTML inlineCss error', e)
                    reject('failed-inline-css')
                })
        })
    }

    async extractText(html: string) {
        const ch = cheerio.load(html)
        const contentLeafs = ch('body [data-content]')
        // todo: for links (`a`), when the link text is not it's `href`, then add the `a href` into the text
        ch('br').replaceWith('\n\r')
        return contentLeafs.toArray().map(
            (e) => ch(e).text()
        )
            .join('\n\r')
    }
}
