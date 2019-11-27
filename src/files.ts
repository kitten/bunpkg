import QuickLRU from 'quick-lru';
import { Buffer } from 'buffer';
import * as stream from 'stream';
import * as env from './env';

const storage = env.NPMFILE_STORAGE;
const cache = new QuickLRU<string, Buffer>({ maxSize: 1000 });

export const putFile = (
  path: string,
  size: number,
  stream: stream.Readable
): Promise<void> => new Promise((resolve, reject) => {
  const buffers: Buffer[] = [];
  stream
    .on('data', buffer => buffers.push(buffer))
    .on('error', reject)
    .on('end', () => {
      const combined = Buffer.concat(buffers, size);
      const target = `file:${path}`;
      cache.set(target, combined);
      storage.put(target, combined);
      resolve();
    })
    .resume();
});

export const putJSON = (path: string, json: object): void =>
  storage.put(`json:${path}`, JSON.stringify(json));

export const getFile = async (path: string): Promise<null | Buffer> => {
  const target = `file:${path}`;
  const file = await storage.get(target, 'arrayBuffer');
  if (!file) {
    return cache.get(target) || null;
  }

  return file;
};

export const getJSON = <T>(path: string): Promise<null | T> =>
  storage.get(`json:${path}`, 'json');
