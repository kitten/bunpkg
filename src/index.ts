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
  const startTime = Date.now();
  let response = await env.CF_CACHE.match(event.request);
  if (!response) {
    response = await serveNPMFile(event.request);
    if (response.status < 400) {
      event.waitUntil(env.CF_CACHE.put(event.request, response.clone()));
    }
  }

  const totalTime = Date.now() - startTime;
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Server-Timing', `total;dur=${totalTime}`);
  return newResponse
};

const serveNPMFile = async (request: Request) => {
  const url = parseUrl(request.url);

  let pathname = url.pathname.slice(1);
  console.log(pathname);
  if (!pathname || pathname === '/') {
    return new Response('Bunpkg', { status: 200 });
  } else if (pathname === 'favicon.ico') {
    return new Response('Not Found', { status: 404 });
  } else if (!pathname.startsWith('n')) {
    return new Response('Not Found', { status: 404 });
  } else {
    pathname = pathname.slice(2);
  }

  const parsed = pathname.match(pkgRe);
  if (!parsed) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    const [, packageName, selector = 'latest', rest = ''] = parsed;
    const manifest = await fetchManifest(packageName, selector);
    const isMeta = url.query === 'meta';

    if (isMeta && selector !== manifest.version) {
      return new Response('', {
        status: 302,
        headers: {
         ...env.BASE_HEADERS,
          'cache-control': env.SHORT_CACHE_CONTROL,
          location: `/n/${manifest._id}${rest}?meta`
        }
      });
    } else if (rest === '/package.json') {
      return new Response(JSON.stringify(manifest), {
        status: 200,
        headers: {
          ...env.BASE_HEADERS,
          'cache-control': env.LONG_CACHE_CONTROL,
          'content-type': 'application/json'
        }
      });
    }

    const contents = await getContents(manifest);
    if ((!rest || rest === '/') && isMeta) {
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
          location: `/n/${target}`
        }
      });
    } else if (asset.size > env.MAX_BYTE_SIZE) {
      return new Response('Asset too large', {
        status: 204,
        headers: {
         ...env.BASE_HEADERS,
          'cache-control': env.LONG_CACHE_CONTROL
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
      console.log(error);
      return new Response(
        'Internal Server Error\n' + error.message,
        { status: 500, headers: env.BASE_HEADERS }
      );
    }
  }
};
