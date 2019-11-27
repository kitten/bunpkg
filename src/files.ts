import QuickLRU from 'quick-lru';
import * as stream from 'stream';

import { streamToBuffer } from './buffer';
import * as env from './env';

const storage = env.NPMFILE_STORAGE;
const cache = new QuickLRU<string, Buffer>({ maxSize: 1000 });

export const putFile = async (
  path: string,
  size: number,
  stream: stream.Readable
): Promise<void> => {
  const buffer = await streamToBuffer(stream, size);
  const target = `file:${path}`;
  cache.set(target, buffer);
  storage.put(target, buffer);
};

export const putJSON = (path: string, json: object, ttl = env.LONG_CACHE_TTL): void =>
  storage.put(`json:${path}`, JSON.stringify(json), { expirationTtl: ttl });

export const getFile = async (path: string): Promise<null | Buffer | ReadableStream> => {
  const target = `file:${path}`;
  const file = await storage.get(target, 'stream');
  if (!file) {
    return cache.get(target) || null;
  }

  return file;
};

export const getJSON = <T>(path: string): Promise<null | T> =>
  storage.get(`json:${path}`, 'json');
