import { normalize as normalizePath } from 'path';

import * as env from '../env';
import { Manifest } from './metadata';
import { getJSON, putJSON, putFile } from './files';
import { getRegistryPath, fetchRegistry } from './registry';
import { getContentType } from './mime';

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

export interface MetaDirectory extends Asset {
  type: 'directory';
  files: Array<File | Directory>;
}

type Archive = Map<string, [number, Uint8Array]>;

const unpackTarball = (() => {
  const wasmArchive = import('../../wasmlib/pkg');
  return async (input: ArrayBuffer): Promise<Archive> => {
    return (await wasmArchive).unpack_tgz(input);
  };
})();

const isFileIncluded = (name: string): boolean =>
  name !== '.npmignore' &&
  name !== '.gitignore' &&
  name !== '.DS_Store';

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
  const response = await fetchRegistry(path);
  const body = await response.arrayBuffer();
  const archive = await unpackTarball(body);

  const contents: Directory = {
    type: 'directory',
    path: '/',
    name: manifest.name,
    files: Object.create(null)
  };

  for (const [filePath, [size, data]] of archive){
    const path = normalizePath(filePath).split('/').filter(Boolean).slice(1);
    const filename = path[path.length - 1];
    if (!isFileIncluded(filename) || !filename) {
      continue;
    }

    const contentType = getContentType(filename);
    const directory = getDirectory(contents, path);
    const normalizedPath = directory.path + filename;

    directory.files[filename] = {
      type: 'file',
      path: normalizedPath,
      name: filename,
      contentType,
      size,
    };

    if (size < env.MAX_BYTE_SIZE) {
      putFile(`${manifest._id}${normalizedPath}`, data);
    }
  }

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

export const toMetaOutput = (
  asset: Directory | File
): MetaDirectory | File => {
  if (asset.type === 'directory') {
    return ({
      ...asset,
      files: Object.keys(asset.files)
        .map(key => toMetaOutput(asset.files[key]))
        .sort(({ name: a }, { name: b }) => {
          return a.length - b.length || a.localeCompare(b);
        })
    } as MetaDirectory);
  } else {
    return asset;
  }
};
