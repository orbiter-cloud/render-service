import { RouteHandler } from '@orbstation/route/RouteHandler'
import { OpenApiApp } from '@orbstation/oas/OpenApiApp'
import { ServiceService } from '../../../services.js'

export interface RapiDocHandlerConfig {
    logo?: string
    serverSelect?: boolean
    serverUrl?: string
}

const RapiDocHandler: (config?: RapiDocHandlerConfig) => RouteHandler = (config = {}) => async(req, res) => {
    const operationIdsRaw = req.query?.operations
    let operationIds: string[] | undefined = undefined
    if(typeof operationIdsRaw === 'string' && operationIdsRaw) {
        operationIds = operationIdsRaw.split(',').map(op => op.trim())
    }
    const oas = ServiceService.use(OpenApiApp)
    const oasInfos = oas.generate(operationIds)
    return res.send(`
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${oasInfos.info.title} · API Docs</title>
    <link href="https://formanta.bemit.codes/styles/main-dark-contrast.css" rel="stylesheet" type="text/css"/>
    <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
    <style>
      rapi-doc{
        width:100%;
      }
    </style>

    <script type="module" src="/docs/rapidoc.js"></script>
    <script>
      function setApiKey(){
        const docEl = document.getElementById('thedoc');
        const keyInputEl = document.getElementById('key-val-input');
        docEl.setAttribute('api-key-name','api_key');
        docEl.setAttribute('api-key-location','header');
        docEl.setAttribute('api-key-value',keyInputEl.value);
      }
    </script>
</head>
<body style="background: #0b0d0f">
<rapi-doc
  spec-url="/openapi.json"
  allow-authentication="false"
  heading-text=${JSON.stringify(oasInfos.info.title)}
  bg-color="#0b0d0f"
  text-color="#eee"
  primary-color="#0097a7"
  render-style="read"
  load-fonts="false"
  regular-font="-apple-system,system-ui,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,sans-serif"
  mono-font="Fira Code, SF Mono, Segoe UI Mono, Menlo, Consolas , Monaco, Liberation Mono, Lucida Console, Courier, monospace"
  allow-spec-url-load="false"
  allow-spec-file-load="false"
  show-method-in-nav-bar="as-colored-text"
  goto-path="overview"
  update-route="false"
  allow-server-selection="${config.serverSelect ? 'true' : 'false'}"
  ${config.serverUrl === 'auto' ?
        'server-url="' + req.protocol + '://' + req.get('host') + '"' :
        config.serverUrl ? 'server-url="' + config.serverUrl + '"' : ''}
  default-api-server="${req.protocol + '://' + req.get('host')}"
>
  <!--
    below html is custom html that adds an input field and a button in header
    on clicking the button the 'api-key-value' is set to the value in input box
  -->
  <div slot='header' style='display:flex; margin:0 16px 0 auto;'>
    <input class='mr1' id='key' type='text'>
    <button class='btn btn-primary' onclick='setApiKey()'> Login </button >
  </div>
  ${config?.logo ?
        `<a slot="logo" href="/" class="flex"><img src="${config?.logo}" alt="Logo" width="32px" height="32px" class="mx1"/></a>` :
        ''}
  <div slot='footer' class='px2 py1'>
    <p class='body2 my05'>
        &copy; ${new Date().getUTCFullYear()} <a href="https://bemit.codes">bemit.codes</a>
    </p>
  </div>
</rapi-doc>

</body>
</html>`)
}

export default RapiDocHandler
