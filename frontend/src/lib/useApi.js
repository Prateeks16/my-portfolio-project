import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';

const messageFrom = (error) => {
  if (error?.response?.data?.detail) return error.response.data.detail;
  if (error?.response?.status === 401) return 'Your session expired. Sign in again.';
  if (error?.code === 'ECONNABORTED' || error?.message === 'Network Error') {
    return 'Could not reach the server. It may still be waking up — try again in a moment.';
  }
  return error?.message || 'Something went wrong.';
};

/**
 * Response cache, keyed by URL and shared across the whole dashboard.
 *
 * Without this every route change refetched from scratch, and since the API is
 * on a free tier that sleeps, each click sat on a spinner. Now a URL that has
 * been loaded once renders instantly from cache and refreshes in the
 * background, so navigation is immediate and the data still converges.
 */
const cache = new Map();

/** In-flight requests, so two components asking for the same URL make one call. */
const inflight = new Map();

const FRESH_MS = 30_000;

export const invalidate = (prefix) => {
  for (const key of cache.keys()) {
    if (!prefix || key.startsWith(prefix)) cache.delete(key);
  }
};

const fetchUrl = (url) => {
  if (inflight.has(url)) return inflight.get(url);
  const request = api
    .get(url)
    .then((response) => {
      cache.set(url, { data: response.data, at: Date.now() });
      return response.data;
    })
    .finally(() => inflight.delete(url));
  inflight.set(url, request);
  return request;
};

/** Warm the cache ahead of a click. Failures are ignored on purpose. */
export const prefetch = (url) => {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < FRESH_MS) return;
  fetchUrl(url).catch(() => {});
};

/**
 * Any successful write invalidates the whole CRM cache. Creating a lead on one
 * screen changes the counts on several others, and a stale dashboard is a worse
 * failure than an extra request.
 */
api.interceptors.response.use((response) => {
  const method = (response.config?.method || 'get').toLowerCase();
  if (method !== 'get') invalidate('/crm/');
  return response;
});

export const useApi = (url, { skip = false } = {}) => {
  const cached = url && !skip ? cache.get(url) : null;

  const [data, setData] = useState(cached ? cached.data : null);
  // Cached data means there is something to paint, so this is not a loading state.
  const [loading, setLoading] = useState(!skip && !cached);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const run = useCallback(
    async ({ background = false } = {}) => {
      if (!url || skip) return;
      const id = ++requestId.current;
      if (!background) setLoading(true);
      setError(null);
      try {
        const result = await fetchUrl(url);
        if (id === requestId.current) setData(result);
      } catch (caught) {
        // A background refresh that fails leaves the cached data on screen
        // rather than replacing a working page with an error.
        if (id === requestId.current && !background) setError(messageFrom(caught));
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [url, skip]
  );

  useEffect(() => {
    if (!url || skip) return;
    const hit = cache.get(url);
    if (hit) {
      setData(hit.data);
      setLoading(false);
      // Only revalidate once the cached copy is old enough to be worth a request.
      if (Date.now() - hit.at < FRESH_MS) return;
      run({ background: true });
      return;
    }
    run();
  }, [url, skip, run]);

  const refetch = useCallback(() => {
    if (url) cache.delete(url);
    return run();
  }, [url, run]);

  const setLocal = useCallback(
    (next) => {
      setData(next);
      if (url) cache.set(url, { data: next, at: Date.now() });
    },
    [url]
  );

  return { data, loading, error, refetch, setData: setLocal };
};

export const apiError = messageFrom;
