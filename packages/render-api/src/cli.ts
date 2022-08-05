import { CommandDispatcher } from '@orbstation/command/CommandDispatcher'
import { ErrorCommandNotFound } from '@orbstation/command/ErrorCommandNotFound'
import process from 'process'
import boot from './boot.js'
import { ServiceService } from './services.js'
import { nanoid } from 'nanoid'

(() => {
    boot()

    const cliRunId = nanoid()

    const commandDispatcher = ServiceService.use(CommandDispatcher)
    const fullArgs = process.argv.slice(2)
    const commandRun = commandDispatcher.prepare(cliRunId)
    commandDispatcher
        .dispatch(commandRun, fullArgs)
        .then(() => {
            console.log('[' + cliRunId + '] command finished')
        })
        .catch((e) => {
            if(e instanceof ErrorCommandNotFound) {
                console.error('[' + cliRunId + '] ' + e.message)
                return commandRun.halt()
                    .then(() => {
                        process.exit(1)
                    })
            }
            console.error('[' + cliRunId + '] command failed', e)
            return commandRun.halt()
                .then(() => {
                    process.exit(2)
                })
        })
})()
