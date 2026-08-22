import React, { useEffect, useState } from 'react';
import { AlertCircle, Inbox, Loader2, X } from 'lucide-react';
import { cx } from '../../lib/format';

/* ---------------------------------------------------------------- surfaces */

/**
 * A panel is a glass plate seated in a machined tray: an outer shell carrying
 * the hairline and the ambient fall, an inner core carrying the content and its
 * own top-edge highlight. Radii are concentric, never nested-and-equal.
 *
 * `className` lands on the shell so callers keep positioning it; the core runs
 * as a flex column so `mt-auto` footers inside pages still work.
 */
export const Panel = ({ className, children, ...rest }) => (
  <section className={cx('bezel-sm', className)} {...rest}>
    <div className="bezel-sm-core flex h-full flex-col overflow-hidden">{children}</div>
  </section>
);

export const PanelHeader = ({ title, meta, action, className }) => (
  <header
    className={cx(
      'flex shrink-0 items-center justify-between gap-4 border-b border-line px-4 py-3',
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

/**
 * Buttons are pills that press. `icon` nests the glyph in its own circular well
 * flush with the right padding — a trailing arrow never sits naked beside the
 * label — and the well carries the kinetic tension while the pill scales down.
 */
export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className,
  children,
  disabled,
  ...rest
}) => {
  const variants = {
    primary:
      'bg-ink text-on-accent hover:bg-white disabled:bg-white/15 disabled:text-ink-tertiary',
    secondary:
      'bg-white/[0.05] text-ink border border-white/10 hover:bg-white/[0.1] hover:border-white/20 disabled:text-ink-tertiary disabled:border-line',
    ghost:
      'text-ink-secondary hover:bg-white/[0.07] hover:text-ink disabled:text-ink-tertiary',
    danger:
      'bg-danger-bg text-danger border border-danger/25 hover:border-danger/50 hover:bg-danger/15 disabled:text-ink-tertiary disabled:border-line',
  };
  const wells = {
    primary: 'bg-black/10 group-hover:bg-black/[0.14]',
    secondary: 'bg-white/10 group-hover:bg-white/[0.16]',
    ghost: 'bg-white/10 group-hover:bg-white/[0.16]',
    danger: 'bg-danger/15 group-hover:bg-danger/25',
  };
  const sizes = {
    sm: 'h-8 text-label gap-1.5',
    md: 'h-9 text-body gap-2',
    lg: 'h-11 text-body gap-2.5',
  };
  const padding = {
    sm: Icon ? 'pl-3 pr-1' : 'px-3',
    md: Icon ? 'pl-4 pr-1' : 'px-4',
    lg: Icon ? 'pl-5 pr-1.5' : 'px-5',
  };
  const wellSize = { sm: 'h-6 w-6', md: 'h-7 w-7', lg: 'h-8 w-8' };

  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'group inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold',
        'transition-all duration-500 ease-fluid active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        padding[size],
        className
      )}
      {...rest}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
      {Icon && (
        <span
          aria-hidden="true"
          className={cx(
            'flex items-center justify-center rounded-full transition-all duration-700 ease-fluid',
            'group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105',
            wellSize[size],
            wells[variant]
          )}
        >
          <Icon size={14} />
        </span>
      )}
    </button>
  );
};

export const Field = ({ label, hint, error, children, className, htmlFor }) => (
  <div className={cx('block', className)}>
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-[0.625rem] font-medium uppercase tracking-[0.16em] text-ink-tertiary"
    >
      {label}
    </label>
    {children}
    {error ? (
      <p className="mt-1.5 text-label text-danger">{error}</p>
    ) : (
      hint && <p className="mt-1.5 text-label text-ink-tertiary">{hint}</p>
    )}
  </div>
);

const control =
  'w-full rounded-control border bg-white/[0.03] px-3 text-body text-ink placeholder:text-ink-tertiary ' +
  'transition-all duration-500 ease-fluid border-white/10 hover:border-white/20 ' +
  'focus:border-white/30 focus:bg-white/[0.06] focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-white/[0.02] disabled:text-ink-tertiary ' +
  'aria-[invalid=true]:border-danger/60';

export const Input = ({ className, ...rest }) => (
  <input className={cx(control, 'h-10', className)} {...rest} />
);

export const Textarea = ({ className, ...rest }) => (
  <textarea className={cx(control, 'resize-y py-2.5 leading-relaxed', className)} {...rest} />
);

export const Select = ({ className, children, ...rest }) => (
  <select className={cx(control, 'h-10 pr-8 [&>option]:bg-surface', className)} {...rest}>
    {children}
  </select>
);

export const Badge = ({ tone = 'neutral', className, children }) => {
  const tones = {
    neutral: 'border-white/10 bg-white/[0.05] text-ink-secondary',
    success: 'border-success/25 bg-success-bg text-success',
    warning: 'border-warning/25 bg-warning-bg text-warning',
    danger: 'border-danger/25 bg-danger-bg text-danger',
    info: 'border-info/25 bg-info-bg text-info',
    solid: 'border-transparent bg-ink text-on-accent',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-micro font-semibold uppercase',
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
    <p className="animate-fadeIn border-t border-line px-4 py-3 text-label text-ink-tertiary">
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
  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
      <Icon size={20} className="text-ink-tertiary" />
    </span>
    <p className="text-panel font-semibold text-ink">{title}</p>
    {message && (
      <p className="mt-2 max-w-sm text-body leading-relaxed text-ink-secondary">
        {message}
      </p>
    )}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export const ErrorNote = ({ children, onRetry }) =>
  children ? (
    <div
      role="alert"
      style={{ animationDuration: '150ms' }}
      className="animate-fadeIn flex items-start gap-2.5 rounded-control border border-danger/25 bg-danger-bg px-3.5 py-3 text-body text-danger"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
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
    <div
      style={{ animationDuration: '150ms' }}
      className={cx(
        'animate-fadeIn rounded-control border px-3.5 py-3 text-body leading-relaxed',
        tones[tone]
      )}
    >
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
  // `render` keeps the dialog in the DOM long enough to animate out. The
  // entrance needs no mount flag: `@starting-style` supplies the from-state,
  // and `data-state` carries the exit. Transitions rather than keyframes, so a
  // modal toggled rapidly retargets from where it is instead of restarting.
  const [render, setRender] = useState(open);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setRender(true);
  }

  useEffect(() => {
    if (open) return undefined;
    const timer = setTimeout(() => setRender(false), 150);
    return () => clearTimeout(timer);
  }, [open]);

  // Keyed on `open`, not `render`: body scroll unlocks the moment the user
  // dismisses, not after the exit finishes.
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

  if (!render) return null;
  return (
    <div
      data-state={open ? 'open' : 'closed'}
      className="modal-scrim fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-2xl"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-state={open ? 'open' : 'closed'}
        className={cx('modal-panel bezel w-full shadow-over', width)}
      >
        <div className="bezel-core">
          <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div>
              <h2 className="text-panel font-semibold text-ink">{title}</h2>
              {description && (
                <p className="mt-1.5 text-label leading-relaxed text-ink-secondary">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-tertiary transition-all duration-500 ease-fluid hover:bg-white/[0.08] hover:text-ink"
            >
              <X size={16} />
            </button>
          </header>
          <div className="px-6 py-6">{children}</div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ layout */

export const PageHeading = ({ title, description, action }) => (
  <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="display-face text-page font-semibold text-ink">{title}</h1>
      {description && (
        <p className="prose-measure mt-2 text-body leading-relaxed text-ink-secondary">
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
