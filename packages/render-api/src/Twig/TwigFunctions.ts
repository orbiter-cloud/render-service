import { ServiceService } from '../services.js'
import { LocaleService } from '@orbito/render/LocaleService'
import { TemplateRegistry } from '@orbito/render/TemplateRegistry'
import { TwigFunction } from '@orbito/render/TemplateService'

export const getBlockName = (blockId: string): string => {
    return blockId.split(':')[2]
}

export const twigFunctions = async(template: string, locale: string): Promise<TwigFunction[]> => {
    const localeService = ServiceService.use(LocaleService)
    const templateRegistry = ServiceService.use(TemplateRegistry)
    const dictionary = await localeService.getDictionary(templateRegistry.templatePathRoot, template, locale || 'en', 'en')
    return [
        {
            name: 'getBlockName',
            func: getBlockName,
        }, {
            name: 't',
            func: dictionary.translate,
        },
    ]
}
