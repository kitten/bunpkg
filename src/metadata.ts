import validatePackageName from 'validate-npm-package-name';
import pickManifest from 'npm-pick-manifest';
import error from 'http-errors';

import { fetchRegistry } from './registry';
import { putJSON, getJSON } from './files';
import * as env from './env';

export interface ManifestDist {
  integrity: string;
  shasum: string;
  tarball: string;
  fileCount: number;
  unpackedSize: number;
}

export interface Manifest {
  _id: string;
  name: string;
  version: string;
  main?: string;
  module?: string;
  web?: string;
  browser?: string;
  dist: ManifestDist;
  /* ... */
}

export interface Packument {
  _id: string;
  _rev: string;
  name: string;
  versions: { [version: string]: Manifest; };
  time: { [version: string]: string; };
  'dist-tags': { [tag: string]: string; };
  /* ... */
}

export const fetchPackument = async (packageName: string) => {
  if (!validatePackageName(packageName).validForNewPackages) {
    throw error(400, 'Invalid package name');
  }

  const cached = await getJSON(packageName);
  if (cached) return cached;

  const response = await fetchRegistry(`/${packageName}`, {
    headers: {
      'content-type': 'application/json'
    }
  });

  try {
    const packument = await response.json();
    putJSON(packageName, packument, env.SHORT_CACHE_TTL);
    return packument;
  } catch (_error) {
    throw error(500);
  }
};

export const fetchManifest = async (packageName: string, selector: string): Promise<Manifest> => {
  const packument = await fetchPackument(packageName);
  try {
    return pickManifest(packument, selector);
  } catch (_error) {
    throw error(400, `@{packageName}@${selector} does not match any published versions`);
  }
};
