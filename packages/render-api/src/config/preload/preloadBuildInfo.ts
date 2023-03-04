import process from 'process'
import fs from 'fs'

export default function(baseFolder: string, packageJson?: { name?: string, version?: string }) {
    let buildInfo: { [k: string]: string } = {}
    try {
        buildInfo = JSON.parse(fs.readFileSync(baseFolder + '/build_info.json', 'utf8') || '{}')
    } catch(e) {
        // noop
    }
    return {
        ...buildInfo,
        GIT_CI_RUN: process.env.GIT_CI_RUN || buildInfo.GIT_CI_RUN,
        GIT_COMMIT: process.env.GIT_COMMIT || buildInfo.GIT_COMMIT,
        // todo: optimize `version` with: `buildNo`, `version`, `buildInfo.name`
        ...(process.env.K_REVISION ?
            {
                version: process.env.K_REVISION,
            } :
            packageJson?.version ?
                {
                    // todo: revise this, as only used to have all log versions the same -> logic for logging not globally `buildInfo`
                    version: packageJson?.name + '@v' + packageJson?.version,
                } : {}),
    }
}
