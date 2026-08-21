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

/** GET a URL, with loading/error/refetch. Ignores results from stale requests. */
export const useApi = (url, { skip = false } = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const run = useCallback(async () => {
    if (!url || skip) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(url);
      if (id === requestId.current) setData(response.data);
    } catch (caught) {
      if (id === requestId.current) setError(messageFrom(caught));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [url, skip]);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, refetch: run, setData };
};

export const apiError = messageFrom;
