export const BASE_HEADERS = { 'access-control-allow-origin': '*' };
export const CF_CACHE = caches.default;
export const NPMFILE_STORAGE = NPMFILES;
export const SHORT_CACHE_TTL = 60;
export const LONG_CACHE_TTL = 60 * 60 * 24 * 365; /* 1y */
export const REGISTRY_URL = 'https://registry.npmjs.org';
export const BUFFER_SIZE = 10000;
