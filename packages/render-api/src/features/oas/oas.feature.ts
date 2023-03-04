import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { OrbServiceExtension } from '@orbstation/service'
import { GET } from '@orbstation/route/RouteDef'
import { loadableHandler } from '@orbstation/route/loadableHandler'
import { CommandDispatcher } from '@orbstation/command/CommandDispatcher'
import { CommandResolverFolder } from '@orbstation/command/CommandResolverFolder'
import { ServiceContainer } from 'service-service'
import { RapiDocHandlerConfig } from './handler/RapiDocHandler.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default ({basePath, ...config}: { basePath: string } & RapiDocHandlerConfig): OrbServiceExtension<{ ServiceService: ServiceContainer<{}> }> => {
    return {
        id: 'oas',
        onBoot: ({ServiceService}) => {
            ServiceService.use(CommandDispatcher)
                .addResolver(new CommandResolverFolder({folder: path.join(__dirname, 'commands')}))
        },
        routes: [
            {
                id: 'oas.file.json', method: GET, path: basePath + '/openapi.json',
                handler: loadableHandler(() => import ('./handler/OpenApiFileHandler.js').then(module => module.default)),
                noSpec: true,
            },
            {
                id: 'oas.file.yml', method: GET, path: basePath + '/openapi.(yml|yaml)',
                handler: loadableHandler(() => import ('./handler/OpenApiFileHandler.js').then(module => module.default)),
                noSpec: true,
            },
            {
                id: 'oas.docs', method: GET, path: basePath + '/docs',
                handler: loadableHandler(() => import ('./handler/RapiDocHandler.js').then(module => module.default(config))),
                noSpec: true,
            },
            {
                id: 'oas.rapidoc-js', method: GET, path: basePath + '/docs/rapidoc.js',
                handler: loadableHandler(() => import ('./handler/RapiDocJsFileHandler.js').then(module => module.default)),
                noSpec: true,
            },
        ],
    }
}
