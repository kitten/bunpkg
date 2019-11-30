import * as semver from 'semver';
import error from 'http-errors';

import * as env from '../env';
import { fetchRegistry } from './registry';
import { putJSON, getJSON } from './files';

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
  unpkg?: string;
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
  license?: string;
  readmeFilename?: string;
  homepage?: string;
  author?: string | object;
  description?: string;
  repository?: string | object;
  bugs?: string | object;
  /* ... */
}

const scopedPackagePattern = new RegExp('^(?:@([^/]+?)[/])?([^/]+?)$');

const isValidPackageName = (packageName: string): boolean => {
  if (
    !packageName ||
    /^[._]/.test(packageName) ||
    packageName.trim() !== packageName ||
    packageName === 'node_modules' ||
    packageName === 'favicon.ico'
  ) {
    return false;
  } else if (encodeURIComponent(packageName) !== packageName) {
    const scopeMatch = packageName.match(scopedPackagePattern);
    if (scopeMatch) {
      const [, user, pkg] = scopeMatch;
      if (encodeURIComponent(user) === user && encodeURIComponent(pkg) === pkg) {
        return true;
      }
    }

    return false;
  }

  return true;
};

export const fetchPackument = async (packageName: string): Promise<Packument> => {
  if (!isValidPackageName(packageName)) {
    throw error(400, 'Invalid package name');
  }

  const cached = await getJSON<Packument>(packageName);
  if (cached) return cached;

  const response = await fetchRegistry(packageName.replace('/', '%2F'), {
    headers: {
      accept: 'application/json'
    }
  });

  try {
    const packument = await response.json();
    await putJSON(packageName, packument, env.SHORT_CACHE_TTL);
    return packument;
  } catch (_error) {
    throw error(500);
  }
};

export const fetchManifest = async (packageName: string, rawSelector: string): Promise<Manifest> => {
  const packument = await fetchPackument(packageName);
  const selector = decodeURIComponent(rawSelector);

  let version: string | void;
  let range: string | void;
  if (!selector || selector === 'latest') {
    version = packument['dist-tags']['latest'];
  } else if (version = semver.valid(selector, true)) {
    version = semver.clean(version, true) || undefined;
  } else if (range = semver.validRange(selector, true)) {
    range = range || undefined;
    version = undefined;
  } else if (version = packument['dist-tags'][selector]) {
    range = undefined;
    version = version || undefined;
  }

  const versions = Object.keys(packument.versions || {})
    .filter(v => semver.valid(v, true));
  if (!versions.length) {
    throw error(400, `No valid versions available for ${packument.name}`);
  } else if (version) {
    const manifest = packument.versions[version];
    if (!manifest) {
      throw error(404, `No valid version found for ${packument.name}@${version}`);
    }

    return manifest;
  } else if (range) {
    const version = semver.maxSatisfying(versions, range, true);
    const manifest = packument.versions[version];
    if (!manifest) {
      throw error(404, `No valid version found for ${packument.name}@${range}`);
    }

    return manifest;
  }

  throw error(400, `${packageName}@${selector} does not match any published versions`);
};
