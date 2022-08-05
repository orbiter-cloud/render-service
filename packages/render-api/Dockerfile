FROM node:16-alpine

RUN mkdir /home/node/app/ && chown -R node:node /home/node/app
RUN mkdir /home/node/app/locales/ && chown -R node:node /home/node/app/locales
RUN mkdir /home/node/app/templates/ && chown -R node:node /home/node/app/templates

WORKDIR /home/node/app

COPY --chown=node:node ./build ./build
COPY --chown=node:node ./cli.js ./cli.js
COPY --chown=node:node ./package.json ./package.json
COPY --chown=node:node ./package-lock.json ./package-lock.json
COPY --chown=node:node ./postcss.config.js ./postcss.config.js

USER node

#RUN npm ci && npm cache clean --force --loglevel=error
# todo: with local & published npm-packages in lerna setup, `ci` keeps failing
RUN npm i --omit=dev && npm cache clean --force --loglevel=error

CMD [ "node", "--experimental-json-modules", "./build/server.js"]
