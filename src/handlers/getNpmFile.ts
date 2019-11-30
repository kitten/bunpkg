import error from 'http-errors';

import * as env from '../env';
import { RouteHandler } from '../types';

import { fetchManifest } from '../utils/metadata';
import { getContents, toMetaOutput } from '../utils/tarball';
import { resolve, getAsset } from '../utils/resolve';
import { getFile } from '../utils/files';

export const getNpmFile: RouteHandler = async (params, request) => {
  const { scope, name, selector = 'latest', '0': rest = '' } = params;
  if (!name) throw error(500);

  const packageName = scope ? `@${scope}/${name}` : name;
  const manifest = await fetchManifest(packageName, selector);
  const isMeta = request.url.endsWith('?meta');

  if (isMeta && selector !== manifest.version) {
    return new Response('', {
      status: 302,
      headers: {
       ...env.BASE_HEADERS,
        'cache-control': env.SHORT_CACHE_CONTROL,
        location: `/n/${manifest._id}/${rest}?meta`
      }
    });
  } else if (rest === 'package.json') {
    return new Response(JSON.stringify(manifest, null, 2), {
      status: 200,
      headers: {
        ...env.BASE_HEADERS,
        'cache-control': env.LONG_CACHE_CONTROL,
        'content-type': 'application/json'
      }
    });
  }

  const contents = await getContents(manifest);
  if (isMeta) {
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
  if (`/${rest}` !== asset.path) {
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
    headers: {
      ...env.BASE_HEADERS,
      'cache-control': env.LONG_CACHE_CONTROL,
      'content-type': asset.contentType || 'text/plain',
      'content-length': `${asset.size}`
    }
  });
};
