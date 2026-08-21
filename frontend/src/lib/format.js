export const STAGES = [
  { key: 'new', label: 'New', tone: 'neutral' },
  { key: 'contacted', label: 'Contacted', tone: 'info' },
  { key: 'replied', label: 'Replied', tone: 'info' },
  { key: 'interviewing', label: 'Interviewing', tone: 'warning' },
  { key: 'offer', label: 'Offer', tone: 'success' },
  { key: 'won', label: 'Won', tone: 'solid' },
  { key: 'lost', label: 'Lost', tone: 'neutral' },
];

export const stageMeta = (key) => STAGES.find((s) => s.key === key) || STAGES[0];

export const SOURCES = [
  ['portfolio', 'Portfolio Contact Form'],
  ['linkedin', 'LinkedIn'],
  ['referral', 'Referral'],
  ['job_board', 'Job Board'],
  ['github', 'GitHub'],
  ['email', 'Inbound Email'],
  ['manual', 'Manually Added'],
  ['other', 'Other'],
];

export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const DIVISIONS = [
  [60, 'second', 1],
  [3600, 'minute', 60],
  [86400, 'hour', 3600],
  [604800, 'day', 86400],
  [2629800, 'week', 604800],
  [31557600, 'month', 2629800],
];

/**
 * Direction-aware relative time. Past reads "3 days ago", future "in 3 days".
 * The magnitude checks use the absolute value so a future timestamp is never
 * mistaken for "just now".
 */
/**
 * Resume-style date range at month granularity.
 *
 * A one-month engagement reads badly as "26 Aug 2025 - 31 Aug 2025", so a range
 * that starts and ends in the same month collapses to just that month.
 */
export const formatDateRange = (start, end) => {
  const month = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  const from = start ? month(start) : null;
  if (!from) return '—';
  if (!end) return `${from} — present`;

  const to = month(end);
  if (!to) return `${from} — present`;
  return from === to ? from : `${from} — ${to}`;
};

export const relativeTime = (value) => {
  if (!value) return '—';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '—';

  const seconds = (Date.now() - then) / 1000;
  const magnitude = Math.abs(seconds);
  const past = seconds >= 0;

  if (magnitude < 45) return 'just now';

  const phrase = (count, unit) => {
    const plural = `${count} ${unit}${count === 1 ? '' : 's'}`;
    return past ? `${plural} ago` : `in ${plural}`;
  };

  for (const [limit, unit, divisor] of DIVISIONS) {
    if (magnitude < limit) return phrase(Math.round(magnitude / divisor), unit);
  }
  return phrase(Math.round(magnitude / 31557600), 'year');
};

/** "3 days overdue" / "due in 2 days" / "due today". */
export const dueLabel = (value) => {
  if (!value) return '—';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '—';

  const seconds = (Date.now() - then) / 1000;
  const magnitude = Math.abs(seconds);
  if (magnitude < 43200) return 'due today';

  for (const [limit, unit, divisor] of DIVISIONS) {
    if (magnitude < limit) {
      const count = Math.round(magnitude / divisor);
      const plural = `${count} ${unit}${count === 1 ? '' : 's'}`;
      return seconds >= 0 ? `${plural} overdue` : `due in ${plural}`;
    }
  }
  const years = Math.round(magnitude / 31557600);
  return seconds >= 0 ? `${years}y overdue` : `due in ${years}y`;
};

/**
 * Resume-derived descriptions arrive two ways: bullets marked with a leading
 * asterisk that wrap across raw newlines, or plain newline-separated
 * paragraphs. Splitting naively on every newline chops sentences in half.
 */
export const toBullets = (text) => {
  if (!text) return [];
  const trimmed = String(text).trim();
  const collapse = (part) => part.replace(/\s+/g, ' ').trim();

  if (/[∗*]/.test(trimmed)) {
    return trimmed.split(/[∗*]+/).map(collapse).filter(Boolean);
  }
  return trimmed.split(/[\r\n]+/).map(collapse).filter(Boolean);
};

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';

// Project tech_stack arrives as a JSON string in some rows and a plain CSV in
// others, so normalise both shapes here rather than at every call site.
export const parseTechStack = (stack) => {
  if (!stack) return [];
  if (Array.isArray(stack)) return stack;
  try {
    const parsed = JSON.parse(stack);
    if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim());
  } catch {
    /* fall through to CSV */
  }
  return String(stack)
    .replace(/[[\]"]/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

export const cx = (...parts) => parts.filter(Boolean).join(' ');
