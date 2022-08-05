import { RouteHandler } from '@orbstation/route/RouteHandler'
import { envIsTrue } from '../lib/envIsTrue.js'
import { ServiceService } from '../services.js'

const HomeHandler: RouteHandler = async(_req, res) => {
    const buildInfo = ServiceService.config('buildInfo')
    return res.send(`
  <!doctype HTML>
<html lang="en">
<head>
    <title>Render API</title>
    <link href="https://formanta.bemit.codes/styles/main-dark.css" rel="stylesheet" type="text/css"/>

    <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
</head>
<body class="bg-body p2">
    <div class='flex items-center mxa mb4'>
        <img src="https://avatars.githubusercontent.com/u/103066539?s=200" alt="Logo" width="64px" height="64px" class="mx1"/>
        <h1 class="h4 mb0 center ml2">
            <span style="display: inline-flex; font-weight: lighter; align-items: center; color: #cacaca">Orbito</span><br/>
            <span style="display: inline-flex; align-items: center; color: #cacaca; font-size: 0.85em;">Render Service</span>
        </h1>
    </div>

    ${envIsTrue(process.env.HOME_NO_DOCS) ? '' : `
    <ul style="width: 280px; text-align: left; margin: 0 auto;">
        <li><a href="/docs">API Docs</a></li>
        <li><a href="/openapi.json">OpenAPI File</a></li>
        <li><a href="https://hub.docker.com/r/bemiteu/render">docker: bemiteu/render</a></li>
        <li><a href="https://github.com/orbiter-cloud/render-service">GitHub project</a></li>
        <li class="list-style-none mt1 ot o-divider right-align"><a href="https:///bemit.codes" class="color-secondary">bemit.codes</a></li>
    </ul>`}

    <div class="my2 flex">
        <code class="right-align p2 overflow-auto grow-1x" style="opacity: 0.5;">${process.env.APP_ENV}:${buildInfo?.GIT_COMMIT || ''}</code>
    </div>
    <p class="center" style="margin: auto 0 4px 0; padding-top: 12px;">
        ${process.env.HOME_FOOTER || `a <a href="https://bemit.codes" target="_blank" rel="noreferrer noopener">bemit.codes</a> project`}
    </p>
</body>
</html>`)
}

export default HomeHandler
