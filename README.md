# Orbito Render

Microservice & framework to render data + template as optimized HTML.

[![Github actions Build](https://github.com/orbiter-cloud/render-service/actions/workflows/blank.yml/badge.svg)](https://github.com/orbiter-cloud/render-service/actions)
[![MIT license](https://img.shields.io/npm/l/@orbito/render?style=flat-square)](https://github.com/orbiter-cloud/render-service/blob/main/LICENSE)
[![Coverage Status](https://img.shields.io/codecov/c/github/orbiter-cloud/render-service/main.svg?style=flat-square)](https://codecov.io/gh/orbiter-cloud/render-service/branch/main)
![Typed](https://flat.badgen.net/badge/icon/Typed?icon=typescript&label&labelColor=blue&color=555555)

[boilerplate & example repository](https://github.com/orbiter-cloud/render-suite)

- [Docker Image](#docker-image)
- [Configuration](#config)
- [Template Setup](#template-setup)
- [HTTP Clients](#clients)

## Docker Image

[bemiteu/render](https://hub.docker.com/r/bemiteu/render)

### Image with baked-in files

Build an image where the `locales` and `templates` are baked in, thus can be pushed to a image repository and used/deployed directly.

```dockerfile
FROM bemiteu/render

COPY --chown=node:node ./locales /home/node/app/locales
COPY --chown=node:node ./templates /home/node/app/templates
```

### Docker Compose Setup

Example setup of a docker-compose suite, with public APIs and `redis` for caching stylesheets.

```yaml
version: "3.9"
services:
    render:
        image: "bemiteu/render"
        environment:
            ACCESS_PUBLIC_DESCRIBE: "yes"
            ACCESS_PUBLIC_RENDER: "yes"
            APP_ENV: local
            NODE_ENV: development
            REDIS_HOST: redis:6379
            PORT: 80
            OA_SERVER_SELECT: "false"
            OA_SERVER_URL: auto
            CACHE_EX_STYLE: 600
            # HOME_FOOTER: "<span>my org</span>"
            # HOME_NO_DOCS: "yes"
        volumes:
            - ./locales:/home/node/app/locales
            - ./templates:/home/node/app/templates
        depends_on:
            - redis
        ports:
            - "3000:80"

    redis:
        image: redis:alpine
```


## Config

Configure with ENV variables.

### ENV Vars: ID

The following variables allows restricting the API for authenticated users, using JWTs as bearer token in authorization header.

Enabled by setting either `ID_KEY_URL` or `ID_KEY_MEM`.

- `ID_ISSUER`, `[string]`, for issuer validation
- `ID_KEY_MEM`, `[string]`, the JWT secret key to use
- `ID_KEY_URL`, `[string]`, the url from where to load the JWT public key, e.g. `/verify-key`
- `ID_KEY_ALGO`, `[string]`, defaults to `HS256`
- `ID_AUDIENCE`, `[string]`, enforces audience validation
- `ID_HOST`, `[string]`, host of your ID service, required for `ID_KEY_URL`

### ENV Vars: Log

The following variables enables logging with Google Cloud Log.

- `GCP_LOG`, `[string]`, path to the authentication file, if set enables google cloud logging
- `LOG_PROJECT`, `[string]`, id of the google cloud project
- `LOG_ID`, `[string]`, id of the logging bucket
- `LOG_SERVICE_NAME`, `[string]`, used in `resource.labels.service`

## Template Setup

Creates a new `template` folder & file structure in the `templates` folder.

### for docker-compose

Uses the mounts from `docker-compose.yml`, so nothing to add here.

```shell
docker-compose run --rm render node cli.js tpl:init my-tpl
```

Optionally specify which `locale` should be created with the second param:

```shell
docker-compose run --rm render node cli.js tpl:init my-tpl fr
```

### for docker

Also requires all ENV vars!

Using current folder on <strong>Windows</strong>:

```shell
docker run --rm -it -v %cd%/templates:/home/node/app/templates -v %cd%/locales:/home/node/app/locales bemiteu/render node cli.js tpl:init my-tpl
```

Using current folder on <strong>Unix</strong>:

```shell
docker run --rm -it \
    -v `pwd`/templates:/home/node/app/templates \
    -v `pwd`/locales:/home/node/app/locales \
    bemiteu/render node cli.js tpl:init my-tpl
```

## Clients

### NodeJS Client

[![npm (scoped)](https://img.shields.io/npm/v/@orbito/render-client?style=flat-square)](https://www.npmjs.com/package/@orbito/render-client)

```shell
npm i --save @orbito/render-client superagent
npm i --save-dev @types/superagent
```

```ts
import { RenderClient } from '@orbito/render-client/RenderClient'

const renderClient = new RenderClient(
    {
        default: 'http://localhost:4264',
    }, {
        html: RenderClient.optimizeForHtml,
        email: RenderClient.optimizeForEmail,
    }
)

const styleId = 'main'

const res = await renderClient.render(
    'default', 'en', styleId,
    renderClient.tplRef('my-tpl', 'pages/default'),// the template reference
    renderClient.optimize('html'),// the optimization settings
    {},// data, available in template under `doc.*`
    {},// styleVars, configure Scss vars just in time
)
console.log('   > rendered template in ' + res.renderTime + 'ms')
const html = res.rendered

const resStyle = await renderClient.style(
    'default', styleId, 'my-tpl',
    {nanoCss: true, cssAutoPrefix: true},
    {},// styleVars, configure Scss vars just in time
)
console.log('   > generated style in ' + resStyle.styleTime + 'ms')

const style = resStyle.style
```

## Versions

This project adheres to [semver](https://semver.org/), until `1.0.0` and beginning with `0.1.0`: all `0.x.0` releases are like MAJOR releases and all `0.0.x` like MINOR or PATCH, modules below `0.1.0` should be considered experimental.

[latest releases](https://github.com/orbiter-cloud/render-service/releases)

## License

This project is free software distributed under the [**MIT License**](./LICENSE).

© 2022 [bemit UG (haftungsbeschränkt)](https://bemit.codes)
