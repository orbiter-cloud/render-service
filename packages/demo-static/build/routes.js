import { GET } from '@orbstation/route/RouteDef';
import { dynamicLoader } from './lib/routing.js';
const apiPrefix = '';
export const routes = [{
  id: 'home',
  method: GET,
  path: apiPrefix + '/',
  handler: dynamicLoader(() => import('./handler/HomeHandler.js').then(module => module.default)),
  noSpec: true
}];