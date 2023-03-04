import { appStarter } from './function.js'
// import spdy from 'spdy'
import process from 'process'

const now = () => {
    const date = new Date()
    return date.getUTCHours().toFixed(0).padStart(2, '0') + ':' +
        date.getUTCMinutes().toFixed(0).padStart(2, '0') + ':' +
        date.getUTCSeconds().toFixed(0).padStart(2, '0')
}

appStarter()
    .then(({app, onHalt, ServiceService}) => {
        // todo: maybe add the `runId`, which is used in `cli`, globally, as maybe also good for general signals logging
        /*const server = spdy
            .createServer(
                {
                    spdy: {
                        // @ts-ignore
                        protocols: ['h2c'],
                        plain: true,
                        ssl: false,
                    },
                    // key: fs.readFileSync('./server.key'),
                    // cert: fs.readFileSync('./server.crt'),
                },
                app,
            )
            .on('error', (err: any) => {
                if(err) {
                    throw new Error(err)
                }
            })
            .listen((process.env.PORT ? parseInt(process.env.PORT) : 3000) as number, () => {
                console.debug(now() + ' [BOOT] server: started on ' + ServiceService.config('host'))
            })*/
        const server = app.listen(process.env.PORT || 3000, () => {
            console.debug(now() + ' [BOOT] server: started on ' + ServiceService.config('host'))
        })

        const shutdown = (signal: string) => {
            // first close the server, so no new connections can be created
            console.debug(now() + ' [' + signal + '] ' + 'server: closing')

            const closeServer = () => {
                server.close((err) => {
                    if(err) {
                        console.error(now() + ' [' + signal + '] ' + 'server: closed with ERROR', err)
                    } else {
                        console.debug(now() + ' [' + signal + '] ' + 'server: closed')
                    }
                    // then clean up your resources and stuff
                    console.debug(now() + ' [' + signal + '] ' + 'connections: halt (' + onHalt.length + ')')
                    Promise.allSettled(onHalt.map(onHalt => onHalt()))
                        .then(() => {
                            console.debug(now() + ' [' + signal + '] ' + 'connections: halted')
                            // then exit gracefully
                            process.exit(err ? 81 : 0)
                        })
                        .catch((err) => {
                            console.error(' [' + signal + '] ' + 'connections: halt failed with ERROR', err)
                            process.exit(82)
                        })
                })
            }
            closeServer()
        }

        let closing = false
        const registerShutdown = (event: string) => {
            process.on(event, () => {
                if(closing) return
                closing = true
                console.debug(now() + ' [' + event + '] process termination signal')
                shutdown(event)
            })
        }

        registerShutdown('SIGINT')
        registerShutdown('SIGTERM')
        registerShutdown('SIGHUP')
        registerShutdown('SIGQUIT')
    })
    .catch(e => {
        console.error('AppStarter failed', e)
        process.exit(1)
    })
