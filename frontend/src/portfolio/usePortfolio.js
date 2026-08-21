import { useEffect, useState } from 'react';
import api from '../api';
import snapshot from '../data/snapshot.json';

const CACHE_KEY = 'pf_content_cache_v1';

/**
 * Content resolution, fastest source first:
 *
 *   1. `snapshot.json`, baked in at build time — available synchronously, so
 *      the first paint is always real content, never a skeleton.
 *   2. `localStorage`, holding whatever the API last returned — newer than the
 *      snapshot whenever the CRM has been edited since the last deploy.
 *   3. The network, which replaces both once it answers.
 *
 * The practical effect is that the Render free tier's cold start stops being
 * visible to visitors: the page is complete before the request even leaves.
 */
const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.profile || parsed?.projects?.length ? parsed : null;
  } catch {
    return null;
  }
};

const writeCache = (payload) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode or quota — the snapshot still covers first paint */
  }
};

const initial = () => {
  const cached = typeof window !== 'undefined' ? readCache() : null;
  const source = cached || snapshot;
  return {
    profile: source.profile || null,
    projects: source.projects || [],
    experiences: source.experiences || [],
    achievements: source.achievements || [],
    // "loading" only means "nothing to show yet", so pre-filled content is not loading.
    loading: !(source.profile || source.projects?.length),
    stale: Boolean(source.profile || source.projects?.length),
    failed: false,
  };
};

export const usePortfolio = () => {
  const [state, setState] = useState(initial);

  useEffect(() => {
    let alive = true;

    const revalidate = async () => {
      const results = await Promise.allSettled([
        api.get('/profile/'),
        api.get('/projects/'),
        api.get('/experiences/'),
        api.get('/achievements/'),
      ]);
      if (!alive) return;

      const everythingFailed = results.every((r) => r.status === 'rejected');
      if (everythingFailed) {
        // Keep showing the snapshot; only admit failure when there is nothing to show.
        setState((current) => ({
          ...current,
          loading: false,
          failed: !(current.profile || current.projects.length),
        }));
        return;
      }

      const value = (result, fallback) =>
        result.status === 'fulfilled' ? result.value.data : fallback;

      const profiles = value(results[0], []);
      const fresh = {
        profile: Array.isArray(profiles) ? profiles[0] || null : profiles,
        projects: value(results[1], []),
        experiences: value(results[2], []),
        achievements: value(results[3], []),
      };

      writeCache(fresh);
      setState({ ...fresh, loading: false, stale: false, failed: false });
    };

    revalidate();
    return () => {
      alive = false;
    };
  }, []);

  return state;
};

export const SNAPSHOT_TAKEN_AT = snapshot.generatedAt;

const CLOUD_NAME = 'dnkzf5hvi';

export const getImageUrl = (path) => {
  if (!path) return null;

  // A stored value that already contains an absolute URL wins, even when a
  // storage backend has prefixed its own base in front of it.
  const absoluteAt = path.lastIndexOf('http');
  if (absoluteAt > 0) return path.slice(absoluteAt);
  if (absoluteAt === 0) return path;

  if (path.startsWith('image/upload/')) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/${path}`;
  }
  return path;
};
