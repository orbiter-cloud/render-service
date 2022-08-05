
const path = require('path');

module.exports = {
    resolve: {
        alias: {
            '@orbito/render': path.resolve(__dirname, './render-lib/src'),
'@orbito/render-client': path.resolve(__dirname, './render-client/src'),
'@orbito/style': path.resolve(__dirname, './style-lib/src'),

        }
    }
}