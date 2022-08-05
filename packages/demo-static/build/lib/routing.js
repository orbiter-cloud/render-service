export const handlerErrorWrapper = (id, fn) => (req, res, next) => {
  res.locals.api_id = id;
  return fn(req, res).catch(next);
};
/**
 * Loading express handlers dynamically
 * @example use `app.get`, `app.post` like needed
 * app.get(
 *     '/example/url-path',
 *     (req: express.Request, res: express.Response, next: express.NextFunction) =>
 *         dynamicLoader(
 *             () => import ('./handler/TemplateOfDistributionsHandler').then(module => module.default)
 *         )(req, res).catch(next)
 * )
 */

export const dynamicLoader = importer => async (req, res) => importer().then(handler => handler(req, res));