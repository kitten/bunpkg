import { Router } from 'tiny-request-router';

import * as env from './env';
import { RouteHandler } from './types';
import { getNpmFile } from './handlers/getNpmFile';
import { getPackument } from './handlers/getPackument';

const router = new Router<RouteHandler>();

router.options('*', async () => {
  return new Response('', {
    status: 200,
    headers: {
      ...env.BASE_HEADERS,
      'cache-control': env.LONG_CACHE_CONTROL,
      'allow': 'OPTIONS, GET, POST'
    }
  });
});

router.get('/', async () => {
  return new Response('Bunpkg', {
    status: 200,
    headers: {
      ...env.BASE_HEADERS,
      'cache-control': env.SHORT_CACHE_CONTROL
    }
  });
});

router.get('/n/@:scope/:name@:selector/(.*)', getNpmFile);
router.get('/n/@:scope/:name@:selector', getNpmFile);
router.get('/n/@:scope/:name/(.*)', getNpmFile);
router.get('/n/@:scope/:name', getNpmFile);
router.get('/n/:name@:selector/(.*)', getNpmFile);
router.get('/n/:name@:selector', getNpmFile);
router.get('/n/:name/(.*)', getNpmFile);
router.get('/n/:name', getNpmFile);

router.get('/i/@:scope/:name', getPackument);
router.get('/i/:name', getPackument);

export { router };
