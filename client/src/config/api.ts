/**
 * API and app URL configuration.
 * In production use relative /api; in development use env or localhost.
 * Never hardcode localhost in components - use these constants.
 */
export const API_BASE_URL = (() => {
  if (import.meta.env.PROD) {
    return '/api';
  }
  return import.meta.env.VITE_API_URL || '/api';
})();

export const APP_URL = (() => {
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  return import.meta.env.VITE_APP_URL || 'http://localhost:5173';
})();

/** Optional debug ingest URL; set only in dev. In production leave unset so no localhost refs. */
export const INGEST_URL = import.meta.env.VITE_INGEST_URL || '';
