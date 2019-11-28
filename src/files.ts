import LRUCache from 'lru-cache';
import * as env from './env';

const storage = env.NPMFILE_STORAGE;

const fileCache = new LRUCache<string, ArrayBufferLike>({
  length: buffer => buffer.byteLength,
  max: env.MAX_BYTE_SIZE * 50,
  maxAge: env.SHORT_CACHE_TTL
});

const jsonCache = new LRUCache<string, any>({
  maxAge: env.SHORT_CACHE_TTL,
  max: 500
});

export const putFile = async (path: string, raw: Uint8Array): Promise<void> => {
  const buffer = raw.buffer;
  const target = `file:${path}`;
  if (!fileCache.has(target)) {
    fileCache.set(target, buffer);
    await storage.put(target, buffer);
  }
};

export const putJSON = async (path: string, json: object, ttl = env.LONG_CACHE_TTL): Promise<void> => {
  if (!jsonCache.has(path)) {
    jsonCache.set(path, json);
    await storage.put(`json:${path}`, JSON.stringify(json), { expirationTtl: ttl });
  }
};

export const getFile = async (path: string): Promise<null | ArrayBufferLike | ReadableStream> => {
  const target = `file:${path}`;
  if (fileCache.has(target)) return fileCache.get(target);
  return (await storage.get(target, 'stream')) || null;
};

export const getJSON = async <T>(path: string): Promise<null | T> => {
  if (jsonCache.has(path)) return jsonCache.get(path);
  return await storage.get(`json:${path}`, 'json');
};
