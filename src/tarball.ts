import { lookup as lookupMime } from 'mime-types';
import { normalize as normalizePath } from 'path';
import { extract } from 'tar-stream';

import { Manifest } from './metadata';
import { getJSON, putJSON, putFile } from './files';
import { getRegistryPath, fetchRegistry } from './registry';
import { arrayLikeToStream } from './buffer';
import * as env from './env';

export interface Asset {
  path: string;
  name: string;
}

export interface File extends Asset {
  type: 'file';
  contentType: string;
  size: number;
}

export interface Directory extends Asset {
  type: 'directory';
  files: { [name: string]: File | Directory; };
}

const flate = import('./flate');

const gunzip = (() => {
  return async (data: Uint8Array): Promise<Uint8Array> => {
    return (await flate).gzip_decode_raw(new Uint8Array(data));
  };
})();

const isFileIncluded = (name: string): boolean =>
  name !== '.npmignore' &&
  name !== '.gitignore' &&
  name !== '.DS_Store';

const getMimeByName = (name: string): string => {
  const mime = lookupMime(name)
  return typeof mime === 'string' ? mime : 'application/octet-stream';
};

const getDirectory = (root: Directory, path: string[]): Directory => {
  let directoryPath = '/';
  let node = root;
  for (let i = 0; i < path.length - 1; i++) {
    const name = path[i];
    directoryPath = directoryPath + name + '/';
    let inner = node.files[name];
    if (!inner || inner.type === 'file') {
      inner = node.files[name] = {
        type: 'directory',
        name,
        path: directoryPath,
        files: Object.create(null)
      };
    }

    node = inner;
  }

  return node;
};

const fetchTarball = async (manifest: Manifest): Promise<Directory> => {
  const path = getRegistryPath(manifest.dist.tarball);
  console.log('-', path);
  const response = await fetchRegistry(path);
  const body = await response.arrayBuffer();
  const decomp = await gunzip(body as any);
  const extractStream = extract();

  const contents: Directory = {
    type: 'directory',
    path: '/',
    name: manifest.name,
    files: Object.create(null)
  };

  const deflate$ = new Promise<Directory>((resolve, reject) => {
    extractStream.on('entry', (header, stream, next) => {
      if (header.type !== 'file' && header.type !== 'directory') {
        stream.on('end', next);
        return stream.resume();
      }

      const path = normalizePath(header.name).split('/').slice(1);
      const filename = path[path.length - 1];
      if (
        (header.type !== 'file' && header.type !== 'directory') ||
        !isFileIncluded(filename) ||
        !filename
      ) {
        stream.on('end', next);
        return stream.resume();
      }

      const size = header.type === 'file' ? header.size : 0;
      const contentType = header.type === 'file' ? getMimeByName(filename) : '';
      const directory = getDirectory(contents, path);
      const normalizedPath = directory.path + filename;

      directory.files[filename] = {
        type: 'file',
        path: normalizedPath,
        name: filename,
        contentType,
        size,
      };

      if (size > env.MAX_BYTE_SIZE) {
        next();
      } else {
        putFile(`${manifest._id}${normalizedPath}`, size, stream)
          .then(next)
          .catch(reject);
      }
    });

    extractStream.on('error', reject);
    extractStream.on('finish', resolve);
  });

  arrayLikeToStream(decomp).pipe(extractStream);
  await deflate$;
  return contents;
};

export const getContents = async (manifest: Manifest, skipCache = false): Promise<Directory> => {
  const path = `${manifest._id}/contents.json`;
  if (!skipCache) {
    const cachedContents = await getJSON<Directory>(path);
    if (cachedContents) return cachedContents;
  }

  const contents = await fetchTarball(manifest);
  await putJSON(path, contents);
  return contents;
};

export const toMetaOutput = (asset: File | Directory): object => {
  if (asset.type === 'directory') {
    return {
      ...asset,
      files: Object.values(asset.files).map(toMetaOutput)
    };
  } else {
    return asset;
  }
};
