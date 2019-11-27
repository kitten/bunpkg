import error from 'http-errors';

import { Manifest } from './metadata';
import { Directory, File } from './tarball';

export const resolve = (
  manifest: Manifest,
  contents: Directory,
  path: string
): File => {
  if (!path || path === '/') {
    const defaultPath =
      manifest.browser ||
      manifest.web ||
      manifest.main ||
      manifest.module ||
      'index.js';
    if (defaultPath === '/') throw error(404, 'File not found');
    return resolve(manifest, contents, defaultPath);
  }

  const parts = path.split('/');
  const last = parts[parts.length - 1];

  let node = contents;
  for (let i = 0, l = parts.length - 1; i < l; i++) {
    const inner = node.files[parts[i]];
    const dir = parts[i];
    if (!dir || dir === '.') {
      continue;
    } else if (!inner || inner.type === 'file') {
      throw error(404, 'File not found');
    } else {
      node = inner;
    }
  }

  let target = last ? node.files[last] : node;
  if (target && target.type === 'directory') {
    target =
      target.files['index.wasm'] ||
      target.files['index.mjs'] ||
      target.files['index.js'] ||
      target.files['index.json'];
  } else if (!target) {
    target =
      node.files[last + '.wasm'] ||
      node.files[last + '.mjs'] ||
      node.files[last + '.js'] ||
      node.files[last + '.json'];
  }

  if (target.type !== 'file') throw error(404, 'File not found');
  return target;
};
