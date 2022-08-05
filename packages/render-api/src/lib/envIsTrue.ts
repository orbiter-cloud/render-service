export const envIsTrue = (envVar: string | undefined): boolean => {
    if(!envVar) return false
    return envVar === 'true' || envVar === '1' || envVar === 'yes' || envVar === 'on'
}
