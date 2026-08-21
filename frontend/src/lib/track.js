import { API_BASE_URL } from '../api';

const SESSION_KEY = 'pf_session_id';

// A random per-tab-session id. No cookies, no fingerprinting, no IP storage -
// just enough to tell "12 views" apart from "12 visitors".
const sessionId = () => {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

/**
 * `navigator.sendBeacon` always sends cross-origin requests in credentials
 * mode "include", and a credentialed request is rejected outright when the
 * server answers with `Access-Control-Allow-Origin: *`. Since the portfolio
 * and the API sit on different hosts, a beacon here fails every time.
 * `fetch` with `keepalive` survives page unload the same way and lets us opt
 * out of credentials, which is what makes the wildcard acceptable.
 */
const beacon = (payload) => {
  fetch(`${API_BASE_URL}/api/crm/track/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, session_id: sessionId() }),
    credentials: 'omit',
    mode: 'cors',
    keepalive: true,
  }).catch(() => {
    /* analytics must never break the page */
  });
};

export const trackPageView = (path) =>
  beacon({
    type: 'pageview',
    path: path || window.location.pathname,
    referrer: document.referrer || '',
  });

export const trackEvent = (name, detail = '') =>
  beacon({
    type: 'event',
    name,
    detail,
    path: window.location.pathname,
  });
