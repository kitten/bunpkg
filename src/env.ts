export const BASE_HEADERS = { 'access-control-allow-origin': '*' };
export const CF_CACHE = caches.default;
export const NPMFILE_STORAGE = NPMFILES;
export const SHORT_CACHE_TTL = 60 * 30; /* 30min */
export const LONG_CACHE_TTL = 60 * 60 * 24 * 365; /* 1y */
export const SHORT_CACHE_CONTROL = 'public, s-max-age=600, max-age: 60';
export const LONG_CACHE_CONTROL = 'public, max-age=31536000';
export const REGISTRY_URL = 'https://registry.npmjs.org';
export const BUFFER_SIZE = 10000;
