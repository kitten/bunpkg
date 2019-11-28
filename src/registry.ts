import Url from 'url-parse';
import error from 'http-errors';

import * as env from './env';

export const getRegistryPath = (fullUrl: string) => new Url(fullUrl, false).pathname;

export const fetchRegistry = async (path: string, init?: RequestInit): Promise<Response> => {
  const opts = { ...init };
  (opts as any).cf = {
    cacheEverything: true,
    cacheTtl: env.SHORT_CACHE_TTL
  };

  const response = await fetch(env.REGISTRY_URL + path, opts);

  if (response.status < 500 && response.status >= 400) {
    throw error(response.status);
  } else if (response.status >= 500) {
    throw error(503);
  } else if (response.status !== 200) {
    throw error(500);
  }

  return response;
};


