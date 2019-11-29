import error from 'http-errors';

import * as env from '../env';
import { RouteHandler } from '../types';

import { fetchPackument } from '../utils/metadata';

export const getPackument: RouteHandler = async (params) => {
  const { scope, name } = params;
  if (!name) throw error(500);

  const packageName = scope ? `@${scope}/${name}` : name;
  const packument = await fetchPackument(packageName);

  const slimmed = {
    _id: packument._id,
    _rev: packument._rev,
    name: packument.name,
    latest: packument['dist-tags']['latest'],
    'dist-tags': packument['dist-tags'],
    versions: Object.keys(packument.versions),
    time: packument.time,
    license: packument.license,
    readmeFilename: packument.readmeFilename,
    homepage: packument.homepage,
    author: packument.author,
    description: packument.description,
    repository: packument.repository,
    bugs: packument.bugs,
  };

  return new Response(JSON.stringify(slimmed), {
    status: 200,
    headers: {
      ...env.BASE_HEADERS,
      'cache-control': env.SHORT_CACHE_CONTROL,
      'content-type': 'application/json'
    }
  });
};
