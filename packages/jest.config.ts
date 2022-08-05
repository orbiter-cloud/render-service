import type { Config } from '@jest/types'

const packages: string[] = ['render-lib', 'render-client', 'style-lib']

const testMatchesLint: string[] = [...packages]

const base: Partial<Config.InitialOptions> = {
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',// todo: validate ESM testing (and JSDom/react compat.), somehow this mapper was all needed - no further ts-jest/babel adjustments
        '^@orbito/render(.*)$': '<rootDir>/render-lib/src$1',
        '^@orbito/render-client(.*)$': '<rootDir>/render-client/src$1',
        '^@orbito/style(.*)$': '<rootDir>/style-lib/src$1',
    },
    moduleFileExtensions: [
        'ts',
        'tsx',
        'js',
        'jsx',
        'json',
        'node',
    ],
    collectCoverage: true,
    coveragePathIgnorePatterns: [
        '(tests/.*.mock).(jsx?|tsx?|ts?|js?)$',
    ],
    verbose: true,
}

const config: Config.InitialOptions = {
    ...base,
    projects: [
        ...packages.map(pkg => ({
            displayName: 'test-' + pkg,
            ...base,
            moduleDirectories: ['node_modules', '<rootDir>/' + pkg + '/node_modules'],
            testMatch: [
                '<rootDir>/' + pkg + '/src/**/*.(test|spec).(js|ts|tsx)',
                '<rootDir>/' + pkg + '/tests/**/*.(test|spec).(js|ts|tsx)',
            ],
        })),
        {
            displayName: 'lint',
            runner: 'jest-runner-eslint',
            ...base,
            testMatch: testMatchesLint.map(pkg => [
                '<rootDir>/' + pkg + '/src/**/*.(js|ts|tsx)',
                '<rootDir>/' + pkg + '/tests/**/*.(test|spec|d).(js|ts|tsx)',
            ]).reduce((arr, i) => [...arr, ...i], [] as string[]),
        },
    ],
    coverageDirectory: '<rootDir>/../coverage',
}

export default config
