#!/bin/bash

echo "//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}" >.npmrc

git checkout -- packages/webpackPartialConfig.js

cd ./packages

cd render-client
cp README.md build/ && cp ../../LICENSE build/
cd ../

cd render-lib
cp README.md build/ && cp ../../LICENSE build/
cd ../

cd style-lib
cp README.md build/ && cp ../../LICENSE build/
cd ../

cd ../

#npm run release
npm run release -- --yes

rm .npmrc
