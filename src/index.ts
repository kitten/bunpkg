import Url from 'url-parse';

import * as env from './env';
import { router } from './routes';

const cachingHandler = async (event: any): Promise<Response> => {
  const startTime = Date.now();
  let response = await env.CF_CACHE.match(event.request);
  if (!response) {
    response = await routerHandler(event);
    if (response.status < 400) {
      event.waitUntil(env.CF_CACHE.put(event.request, response.clone()));
    }
  }

  const totalTime = Date.now() - startTime;
  response = new Response(response.body, response);
  response.headers.set('Server-Timing', `total;dur=${totalTime}`);
  return response;
};

const routerHandler = async ({ request }: any): Promise<Response> => {
  const { pathname } = new Url(request.url);
  const match = router.match(request.method, pathname);
  if (!match) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    return await match.handler(match.params, request);
  } catch (error) {
    return new Response(
      `${!error.status ? 'Internal Server Error\n' : ''}${error.message}`,
      {
        status: error.status || 500,
        headers: env.BASE_HEADERS
      }
    );
  }
};

addEventListener('fetch', (event: any) => event.respondWith(cachingHandler(event)));
