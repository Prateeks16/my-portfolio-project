import { useEffect, useState } from 'react';

/**
 * A clock the render phase can read safely.
 *
 * Reading `Date.now()` during render makes a component impure: the same props
 * produce different output on an incidental re-render. Holding the timestamp in
 * state and advancing it on an interval keeps render pure, and has the useful
 * side effect that "3 days overdue" ticks over on its own during a long session
 * instead of going stale until the next navigation.
 */
export const useNow = (intervalMs = 60_000) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
};
