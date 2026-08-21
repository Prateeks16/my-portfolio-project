import React, { useEffect, useState } from 'react';
import { AlertCircle, Inbox, Loader2, X } from 'lucide-react';
import { cx } from '../../lib/format';

/* ---------------------------------------------------------------- surfaces */

export const Panel = ({ className, children, ...rest }) => (
  <section
    className={cx('rounded-panel border border-line bg-surface shadow-row', className)}
    {...rest}
  >
    {children}
  </section>
);

export const PanelHeader = ({ title, meta, action, className }) => (
  <header
    className={cx(
      'flex items-center justify-between gap-4 border-b border-line px-4 py-3',
      className
    )}
  >
    <div className="min-w-0">
      <h2 className="truncate text-panel font-semibold text-ink">{title}</h2>
      {meta && <p className="mt-0.5 text-label text-ink-tertiary">{meta}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
);

/* ---------------------------------------------------------------- controls */

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...rest
}) => {
  const variants = {
    primary:
      'bg-ink text-white hover:bg-ink-secondary active:bg-ink disabled:bg-line-strong disabled:text-white',
    secondary:
      'bg-surface text-ink border border-line-strong hover:border-ink-tertiary hover:bg-surface-sunk active:bg-line/40 disabled:text-ink-tertiary disabled:border-line',
    ghost:
      'text-ink-secondary hover:bg-line/50 hover:text-ink active:bg-line disabled:text-ink-tertiary',
    danger:
      'bg-surface text-danger border border-danger/30 hover:bg-danger-bg hover:border-danger active:bg-danger-bg disabled:text-ink-tertiary disabled:border-line',
  };
  const sizes = {
    sm: 'h-8 px-2.5 text-label gap-1.5',
    md: 'h-9 px-3.5 text-body gap-2',
    lg: 'h-11 px-5 text-body gap-2',
  };
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center whitespace-nowrap rounded-control font-medium',
        'transition-colors duration-150 ease-out disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
};

export const Field = ({ label, hint, error, children, className, htmlFor }) => (
  <div className={cx('block', className)}>
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-label font-semibold text-ink-secondary"
    >
      {label}
    </label>
    {children}
    {error ? (
      <p className="mt-1 text-label text-danger">{error}</p>
    ) : (
      hint && <p className="mt-1 text-label text-ink-tertiary">{hint}</p>
    )}
  </div>
);

const control =
  'w-full rounded-control border bg-surface px-3 text-body text-ink placeholder:text-ink-tertiary ' +
  'transition-colors duration-150 ease-out border-line-strong hover:border-ink-tertiary ' +
  'focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink ' +
  'disabled:cursor-not-allowed disabled:bg-surface-sunk disabled:text-ink-tertiary ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger';

export const Input = ({ className, ...rest }) => (
  <input className={cx(control, 'h-9', className)} {...rest} />
);

export const Textarea = ({ className, ...rest }) => (
  <textarea className={cx(control, 'resize-y py-2 leading-relaxed', className)} {...rest} />
);

export const Select = ({ className, children, ...rest }) => (
  <select className={cx(control, 'h-9 pr-8', className)} {...rest}>
    {children}
  </select>
);

export const Badge = ({ tone = 'neutral', className, children }) => {
  const tones = {
    neutral: 'border-line-strong bg-surface-sunk text-ink-secondary',
    success: 'border-success/25 bg-success-bg text-success',
    warning: 'border-warning/25 bg-warning-bg text-warning',
    danger: 'border-danger/25 bg-danger-bg text-danger',
    info: 'border-info/25 bg-info-bg text-info',
    solid: 'border-ink bg-ink text-white',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-micro font-semibold uppercase',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
};

/* ------------------------------------------------------------------ states */

/** Skeletons take the shape of the content they replace — never a floating spinner. */
export const SkeletonLine = ({ className }) => (
  <div className={cx('skeleton h-3', className)} />
);

export const SkeletonRows = ({ rows = 5, className }) => (
  <div className={cx('divide-y divide-line', className)} aria-hidden="true">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex items-center gap-4 px-4 py-3.5">
        <div className="skeleton h-8 w-8 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonLine className={index % 2 ? 'w-2/5' : 'w-1/3'} />
          <SkeletonLine className={index % 2 ? 'w-1/4' : 'w-1/5'} />
        </div>
        <div className="skeleton h-5 w-16 shrink-0 rounded-full" />
      </div>
    ))}
  </div>
);

/**
 * Render on Render's free tier and the first request can take ~60s. Silence for
 * that long reads as breakage, so after 8s the skeleton explains itself.
 */
export const ColdStartNote = ({ delay = 8000 }) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  if (!show) return null;
  return (
    <p className="border-t border-line px-4 py-3 text-label text-ink-tertiary">
      Still waiting on the server. It sleeps when idle and can take up to a minute
      to wake — this only happens on the first request.
    </p>
  );
};

export const LoadingPanel = ({ rows = 5, label }) => (
  <div role="status" aria-live="polite">
    <span className="sr-only">{label || 'Loading'}</span>
    <SkeletonRows rows={rows} />
    <ColdStartNote />
  </div>
);

export const EmptyState = ({ icon: Icon = Inbox, title, message, action }) => (
  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
    <span className="mb-3.5 rounded-full bg-surface-sunk p-3 ring-1 ring-line">
      <Icon size={20} className="text-ink-tertiary" strokeWidth={1.75} />
    </span>
    <p className="text-panel font-semibold text-ink">{title}</p>
    {message && (
      <p className="mt-1.5 max-w-sm text-body leading-relaxed text-ink-secondary">
        {message}
      </p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorNote = ({ children, onRetry }) =>
  children ? (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-control border border-danger/30 bg-danger-bg px-3.5 py-3 text-body text-danger"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" strokeWidth={2} />
      <span className="flex-1 leading-relaxed">{children}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 font-semibold underline underline-offset-2"
        >
          Retry
        </button>
      )}
    </div>
  ) : null;

export const Note = ({ tone = 'info', children }) => {
  const tones = {
    info: 'border-info/25 bg-info-bg text-info',
    warning: 'border-warning/25 bg-warning-bg text-warning',
    success: 'border-success/25 bg-success-bg text-success',
  };
  return (
    <div className={cx('rounded-control border px-3.5 py-3 text-body leading-relaxed', tones[tone])}>
      {children}
    </div>
  );
};

/* ---------------------------------------------------------------- overlays */

/**
 * Reserved for the two places focus genuinely must be protected: destructive
 * confirmation, and confirming a send. Everything else is inline or a route.
 */
export const Modal = ({ open, onClose, title, description, children, width = 'max-w-lg' }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'w-full animate-fadeIn rounded-panel border border-line bg-surface shadow-over',
          width
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-panel font-semibold text-ink">{title}</h2>
            {description && (
              <p className="mt-1 text-label leading-relaxed text-ink-secondary">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-control p-1.5 text-ink-tertiary transition-colors duration-150 hover:bg-line/60 hover:text-ink"
          >
            <X size={17} />
          </button>
        </header>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ layout */

export const PageHeading = ({ title, description, action }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="text-page font-semibold text-ink">{title}</h1>
      {description && (
        <p className="prose-measure mt-1.5 text-body leading-relaxed text-ink-secondary">
          {description}
        </p>
      )}
    </div>
    {action}
  </div>
);

/** A single dense summary line. Deliberately not a row of hero-metric tiles. */
export const SummaryLine = ({ items }) => (
  <p className="tabular flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-ink-secondary">
    {items
      .filter(Boolean)
      .map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 && <span aria-hidden="true" className="text-line-strong">·</span>}
          <span className={item.tone === 'alert' ? 'font-semibold text-danger' : undefined}>
            <span className="font-semibold text-ink">{item.value}</span> {item.label}
          </span>
        </React.Fragment>
      ))}
  </p>
);
