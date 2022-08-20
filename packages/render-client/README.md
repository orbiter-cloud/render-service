# Orbito Render Client

[![npm (scoped)](https://img.shields.io/npm/v/@orbito/render-client?style=flat-square)](https://www.npmjs.com/package/@orbito/render-client)
[![Github actions Build](https://github.com/orbiter-cloud/render-service/actions/workflows/blank.yml/badge.svg)](https://github.com/orbiter-cloud/render-service/actions)
[![MIT license](https://img.shields.io/npm/l/@orbito/render-client?style=flat-square)](https://github.com/orbiter-cloud/render-service/blob/main/LICENSE)
![Typed](https://flat.badgen.net/badge/icon/Typed?icon=typescript&label&labelColor=blue&color=555555)

HTTP client to use with [Orbito Render](https://github.com/orbiter-cloud/render-service).

```shell
npm i --save @orbito/render-client
```

```ts
import { RenderClient } from '@orbito/render-client/RenderClient'

const renderClient = new RenderClient(
    {
        default: 'http://localhost:4264',
    }, {
        html: RenderClient.optimizeForHtml,
        email: RenderClient.optimizeForEmail,
    },
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

> ESM only package

## License

[MIT License](https://github.com/orbiter-cloud/render-service/blob/main/LICENSE)

© 2022 [bemit](https://bemit.codes)
