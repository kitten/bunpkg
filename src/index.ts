import error from 'http-errors';
import { parse as parseUrl } from 'url';
import { contentType } from 'mime-types';

import * as env from './env';
import { fetchManifest } from './metadata';
import { getContents, toMetaOutput } from './tarball';
import { resolve, getAsset } from './resolve';
import { getFile } from './files';

const pkgRe = /^(@[\w-]+\/[\w-]+|[\w-]+)(?:@([\w\d-\.]+))?(\/.*)?/;

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
          'cache-control': env.LONG_CACHE_CONTROL,
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
    if (response.status < 400) {
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
    const [, packageName, selector = 'latest', rest = ''] = parsed;
    const manifest = await fetchManifest(packageName, selector);
    const contents = await getContents(manifest);
    const isMeta = url.query === 'meta';

    if (isMeta && selector !== manifest.version) {
      return new Response('', {
        status: 302,
        headers: {
         ...env.BASE_HEADERS,
          'cache-control': env.SHORT_CACHE_CONTROL,
          location: `/${manifest._id}${rest}?meta`
        }
      });
    } else if ((!rest || rest === '/') && isMeta) {
      return new Response(JSON.stringify(toMetaOutput(contents)), {
        status: 200,
        headers: {
          ...env.BASE_HEADERS,
          'cache-control': env.LONG_CACHE_CONTROL,
          'content-type': 'application/json'
        }
      });
    } else if (isMeta) {
      const asset = getAsset(contents, rest);
      return new Response(JSON.stringify(toMetaOutput(asset)), {
        status: 200,
        headers: {
          ...env.BASE_HEADERS,
          'cache-control': env.LONG_CACHE_CONTROL,
          'content-type': 'application/json'
        }
      });
    }

    const asset = resolve(manifest, contents, rest);
    const target = `${manifest._id}${asset.path}`;
    if (target !== pathname) {
      return new Response('', {
        status: 302,
        headers: {
         ...env.BASE_HEADERS,
          'cache-control': selector !== manifest.version
            ? env.SHORT_CACHE_CONTROL
            : env.LONG_CACHE_CONTROL,
          location: `/${target}`
        }
      });
    }

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
        'cache-control': env.LONG_CACHE_CONTROL,
        'content-type': contentType(asset.contentType),
        'content-length': asset.size
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
