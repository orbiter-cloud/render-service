const fs = require('fs')
const path = require('path')
const {
    runCLI,
} = require('deployer-buddy')

const rootDir = __dirname
const GIT_BRANCH = process.env.GIT_BRANCH

const handler = {
    buildInfoDocs: async () => {
    },
    buildInfo: async () => {
        if(
            process.env.GIT_URL_CI_RUN ||
            process.env.GIT_URL_COMMIT ||
            process.env.GIT_CI_RUN ||
            process.env.GIT_COMMIT
        ) {
            const buildInfo = {
                GIT_BRANCH: GIT_BRANCH,
                GIT_URL_CI_RUN: process.env.GIT_URL_CI_RUN,
                GIT_URL_COMMIT: process.env.GIT_URL_COMMIT,
                GIT_CI_RUN: process.env.GIT_CI_RUN,
                GIT_COMMIT: process.env.GIT_COMMIT,
            }
            fs.writeFileSync(path.join(rootDir, 'packages/render-api/build/build_info.json'), JSON.stringify(buildInfo))
        }
        console.log('Created Build Info File.')
    },
}

runCLI(actionTargets, handler)
