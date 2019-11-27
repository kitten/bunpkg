import error from 'http-errors';
import { parse as parseUrl } from 'url';
import { contentType } from 'mime-types';

import * as env from './env';
import { fetchManifest } from './metadata';
import { getContents } from './tarball';
import { getFile } from './files';
import { resolve } from './resolve';

const pkgRe = /^(@[\w-]+\/[\w-]+|[\w-]+)(?:@([\w-]+|\d+\.\d+\.\d+(?:-[\.\w-]+)?))?(.*)/;

addEventListener('fetch', (event: any) => {
  let response: Response;
  switch (event.request.method) {
    case 'GET':
      return event.respondWith(handleGET(event));
    case 'OPTIONS':
      response = new Response('', {
        status: 200,
        headers: {
          ...env.BASE_HEADERS,
          'cache-control': 'public, max-age=31536000',
          'allow': 'OPTIONS, GET, POST'
        }
      });
      break;
    default:
      response = new Response('Method not supported', { status: 400 });
      break;
  }

  event.respondWith(response);
});

const handleGET = async (event: any) => {
  let response = await env.CF_CACHE.match(event.request);
  if (!response) {
    response = await serveNPMFile(event.request);
    if (response.status === 200) {
      event.waitUntil(env.CF_CACHE.put(event.request, response.clone()));
    }
  }

  return response
};

const serveNPMFile = async (request: Request) => {
  const url = parseUrl(request.url);
  const pathname = url.pathname.slice(1);
  const parsed = pathname.match(pkgRe);
  if (!parsed) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    const [, packageName, selector = 'latest', rest] = parsed;
    const manifest = await fetchManifest(packageName, selector);
    const contents = await getContents(manifest);

    if ((!rest || rest === '/') && url.query === 'meta') {
      return new Response(JSON.stringify(contents), {
        status: 200,
        headers: {
          ...env.BASE_HEADERS,
          'content-type': 'application/json'
        }
      });
    }

    const asset = resolve(manifest, contents, rest);
    const target = `${manifest._id}${asset.path}`;

    let file = await getFile(target);
    if (!file) {
      await getContents(manifest, true);
      file = await getFile(target);
      if (!file) throw error(500);
    }

    return new Response(file, {
      status: 200,
      headers: ({
        ...env.BASE_HEADERS,
        'cache-control': 'public, max-age=31536000',
        'content-type': contentType(asset.contentType),
        'content-length': asset.size,
        'content-location': `/${target}`
      } as any)
    });
  } catch (error) {
    if (error.status) {
      return new Response(error.message, { status: error.status, headers: env.BASE_HEADERS });
    } else {
      return new Response('Internal Server Error', { status: 500, headers: env.BASE_HEADERS });
    }
  }
};
