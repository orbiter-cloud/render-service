import { OrbServiceFeatures } from '@orbstation/service/OrbServiceFeatures'

export const serviceFeatures = new OrbServiceFeatures({
    'log:global': {default: false},
    'log:request': {default: true},
    'gcp:log': {default: true},
})
