import { RouteHandler } from '@orbstation/route/RouteHandler'

const RapiDocHandler: RouteHandler = async(req, res) => {
    return res.send(`
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Orbito Render · API Docs</title>
    <link href="https://formanta.bemit.codes/styles/main-dark-contrast.css" rel="stylesheet" type="text/css"/>

    <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
    <style>
      rapi-doc{
        width:100%;
      }
    </style>

    <script type="module" src="/rapidoc/rapidoc.js"></script>
    <script>
      function setApiKey(){
        const docEl = document.getElementById('thedoc');
        const keyInputEl = document.getElementById('key-val-input');
        docEl.setAttribute('api-key-name', 'api_key');
        docEl.setAttribute('api-key-location', 'header');
        docEl.setAttribute('api-key-value', keyInputEl.value);
      }
    </script>
</head>
<body>
<rapi-doc
  heading-text="Orbito Render Service"
  bg-color="#0b0d0f"
  text-color="#eee"
  primary-color="#0097a7"
  render-style="read"
  load-fonts="false"
  regular-font="-apple-system,system-ui,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,sans-serif"
  mono-font="SF Mono,Segoe UI Mono,Roboto Mono,Menlo,Courier,monospace"
  spec-url="/openapi.json"
  allow-authentication="false"
  allow-spec-url-load="false"
  allow-spec-file-load="false"
  allow-server-selection="${process.env.OA_SERVER_SELECT === '1' || process.env.OA_SERVER_SELECT === 'true' || process.env.OA_SERVER_SELECT === 'yes' ? 'true' : 'false'}"
  ${process.env.OA_SERVER_URL === 'auto' ?
        'server-url="' + req.protocol + '://' + req.get('host') + '"' :
        process.env.OA_SERVER_URL ? 'server-url="' + process.env.OA_SERVER_URL + '"' : ''}
  default-api-server="${req.protocol + '://' + req.get('host')}"
  show-method-in-nav-bar="as-colored-text"
  goto-path="overview"
  update-route="true"
>
  <!--
    below html is custom html that adds an input field and a button in header
    on clicking the button the 'api-key-value' is set to the value in input box
  -->
  <div slot='header' style='display:flex; margin:0 16px 0 auto;'>
    <input class='mr1' id='key' type='text'>
    <button class='btn btn-primary' onclick='setApiKey()'> Login </button>
  </div>
  <a slot="logo" href="/" class="flex"><img src="https://avatars.githubusercontent.com/u/103066539?s=200" alt="Logo" width="32px" height="32px" class="mx1"/></a>
  <div slot='footer' class='px2 py1'>
    <p class='body2 my05'>
        &copy ${new Date().getUTCFullYear()} <a href="https://bemit.codes">bemit.codes</a>
    </p>
  </div>
</rapi-doc>

</body>
</html>`)
}

export default RapiDocHandler
