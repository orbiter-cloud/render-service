import { DateTime } from 'luxon'
import { LocalesDictionary } from '@orbito/render/LocaleService'
import { TwigFunction } from '@orbito/render/TemplateService'

export const dateTimeFromSql = (date: string, _args: [string]): DateTime => {
    const zone = _args[0] as string
    return DateTime.fromSQL(date, zone ? {zone} : undefined)
}

export const dateTimeFromIso = (date: string, _args: [string]): DateTime => {
    const zone = _args[0] as string
    return DateTime.fromISO(date, zone ? {zone} : undefined)
}

export const convertTimezoneDateTime = (date: DateTime, _args: [string, string]): DateTime => {
    const targetTz = _args[0] as string
    return date.setZone(targetTz)
}

export const convertTimezoneDateTimeIso = (date: string, _args: [string, string]): DateTime => {
    const sourceTz = _args[0] as string
    const targetTz = _args[1] as string
    return DateTime.fromISO(date, {zone: sourceTz}).setZone(targetTz)
}

export const dateTimeFormat = (date: DateTime, _args: [string]): string => {
    const format = _args[0] as string
    return date.toFormat(format)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const makeLocaleDateTime = (dictionary: LocalesDictionary) => (date: string, _args: [string]): string => {
    return DateTime.fromISO(date).toFormat(dictionary.format('datetime') as string)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const makeLocaleDate = (dictionary: LocalesDictionary) => (date: string, _args: [string]): string => {
    return DateTime.fromISO(date).toFormat(dictionary.format('date') as string)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const makeLocaleTime = (dictionary: LocalesDictionary) => (date: string, _args: [string]): string => {
    return DateTime.fromISO(date).toFormat(dictionary.format('time') as string)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const makeLocaleFormat = (dictionary: LocalesDictionary) => (date: string, _args: [string]): string => {
    return DateTime.fromISO(date).toFormat(dictionary.format('time') as string)
}

export const twigFilters = (): TwigFunction[] => {
    // const localeService: LocaleService = ServiceService.get<LocaleService>('LocaleService')
    // const dictionary = await localeService.getDictionary(template, locale, 'en')
    return [
        {
            name: 'datetime_from_sql',
            func: dateTimeFromSql,
        }, {
            name: 'datetime_from_iso',
            func: dateTimeFromIso,
        }, {
            name: 'datetime_format',
            func: dateTimeFormat,
        }, {
            name: 'convert_tz_datetime',
            func: convertTimezoneDateTime,
        }, {
            name: 'convert_tz_datetime_iso',
            func: convertTimezoneDateTimeIso,
        }, /*{
            name: 'locale_datetime_format',
            func: makeLocaleDateTime(dictionary),
        }, {
            name: 'locale_datetime_from_format_to',
            func: makeLocaleDateTime(dictionary),
        }, {
            name: 'locale_datetime',
            func: makeLocaleDateTime(dictionary),
        }, {
            name: 'locale_date',
            func: makeLocaleDate(dictionary),
        }, {
            name: 'locale_time',
            func: makeLocaleTime(dictionary),
        }, */{
            name: 'json_encode',
            func: (data: any, args: [string]): string => {
                return JSON.stringify(data, undefined, args?.[0] === 'JSON_PRETTY_PRINT' ? 4 : 0)
            },
        }
    ]
}
