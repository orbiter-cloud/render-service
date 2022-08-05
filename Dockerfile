FROM node:14-alpine

ARG app_path

RUN apk --no-cache add shadow \
     gcc \
     musl-dev \
     autoconf \
     automake \
     make \
     libtool \
     nasm \
     tiff \
     jpeg \
     zlib \
     zlib-dev \
     file \
     pkgconf

RUN mkdir /home/node/app/ && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY --chown=node:node ${app_path} ./

USER node

#RUN npm ci && npm cache clean --force --loglevel=error
# todo: with local & published npm-packages in lerna setup, `ci` keeps failing
RUN npm i && npm cache clean --force --loglevel=error

USER root

RUN apk del autoconf gcc autoconf automake make libtool

USER node

CMD [ "node", "--experimental-json-modules", "server.js"]
