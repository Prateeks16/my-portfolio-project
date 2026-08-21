/**
 * Bake the portfolio's content into the bundle at build time.
 *
 * The API lives on Render's free tier, which sleeps after ~15 minutes idle and
 * can take the better part of a minute to answer the first request. Without
 * this, a recruiter arriving on a cold backend sees skeletons for that whole
 * minute. With it, the page paints real content immediately and the network
 * copy quietly replaces it once it arrives.
 *
 * Failure here is never fatal: if the API cannot be reached the previous
 * snapshot is kept, and if there is none an empty one is written so the import
 * always resolves.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../src/data/snapshot.json');

const API =
  process.env.VITE_API_BASE_URL ||
  'https://my-portfolio-backend-awei.onrender.com';

const ENDPOINTS = ['profile', 'projects', 'experiences', 'achievements'];
const TIMEOUT_MS = 90_000;

const fetchJson = async (endpoint) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API}/api/${endpoint}/`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

const keepExisting = (reason) => {
  if (existsSync(OUT)) {
    const bytes = readFileSync(OUT, 'utf8');
    console.warn(
      `[snapshot] ${reason} — keeping the existing snapshot (${bytes.length} bytes).`
    );
    return;
  }
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify(
      { generatedAt: null, profile: null, projects: [], experiences: [], achievements: [] },
      null,
      2
    )
  );
  console.warn(`[snapshot] ${reason} — wrote an empty snapshot so the build can continue.`);
};

const main = async () => {
  console.log(`[snapshot] fetching content from ${API} (Render may need to wake up)…`);
  try {
    const [profile, projects, experiences, achievements] = await Promise.all(
      ENDPOINTS.map(fetchJson)
    );

    const payload = {
      generatedAt: new Date().toISOString(),
      profile: Array.isArray(profile) ? profile[0] || null : profile,
      projects: Array.isArray(projects) ? projects : [],
      experiences: Array.isArray(experiences) ? experiences : [],
      achievements: Array.isArray(achievements) ? achievements : [],
    };

    if (!payload.profile && payload.projects.length === 0) {
      keepExisting('API responded but returned nothing usable');
      return;
    }

    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(
      `[snapshot] baked ${payload.projects.length} projects, ` +
        `${payload.experiences.length} experiences, ` +
        `${payload.achievements.length} achievements.`
    );
  } catch (error) {
    keepExisting(`could not reach the API (${error.message})`);
  }
};

// This runs as `prebuild`, so a throw here would fail the whole deploy. Baking
// fresh content is an optimisation, never a release gate: swallow everything and
// exit clean, leaving the committed snapshot in place.
main()
  .catch((error) => {
    keepExisting(`snapshot step errored (${error?.message || error})`);
  })
  .finally(() => {
    process.exitCode = 0;
  });
