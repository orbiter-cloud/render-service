import process from 'process'
import { nanoid } from 'nanoid'
import boot from './boot.js'
import { CommandDispatcher } from '@orbstation/command/CommandDispatcher'
import { ErrorCommandNotFound } from '@orbstation/command/ErrorCommandNotFound'
import { ErrorCommandAborted } from '@orbstation/command/ErrorCommandAborted'

boot('cli')
    .then(({ServiceService, onHalt}) => {
        const cliRunId = nanoid()
        const commandDispatcher = ServiceService.use(CommandDispatcher)
        const fullArgs = process.argv.slice(2)
        const commandRun = commandDispatcher.prepare(cliRunId, {}, {logHalt: true}, ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT'])
        console.debug('[' + cliRunId + '] dispatch')
        // todo: commandRun must also support prioritized onHalt - when `server.onHalt` supports that
        // todo: use serial closing, as e.g. queue should be stopped before stopping redis - and not at the same time
        commandRun.onHalt(() => Promise.allSettled(onHalt.map(halt => halt())).then(() => undefined))
        return commandDispatcher
            .dispatch(commandRun, fullArgs)
            .catch((e) => {
                if(e instanceof ErrorCommandAborted) {
                    console.log('[' + cliRunId + '] command aborted')
                    process.exit(0)
                }
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
            .then(() => {
                console.debug('[' + cliRunId + '] command finished')
                return commandRun.halt()
            })
            .then<void>(() => process.exit(0))
    })
