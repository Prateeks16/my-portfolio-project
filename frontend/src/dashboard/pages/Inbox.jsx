import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox as InboxIcon, Send, UserPlus } from 'lucide-react';
import api from '../../api';
import { apiError, useApi } from '../../lib/useApi';
import { cx, formatDateTime, initials, relativeTime } from '../../lib/format';
import {
  Button,
  EmptyState,
  ErrorNote,
  LoadingPanel,
  Note,
  Panel,
  PageHeading,
} from '../components/ui';

const Inbox = () => {
  const { data, loading, error, refetch } = useApi('/crm/inbox/');
  const [selectedId, setSelectedId] = useState(null);
  const [converting, setConverting] = useState(null);
  const [flash, setFlash] = useState(null);

  const messages = Array.isArray(data) ? data : [];
  const selected = messages.find((m) => m.id === selectedId) || messages[0];

  const convert = async (message) => {
    setConverting(message.id);
    setFlash(null);
    try {
      const { data: result } = await api.post(`/crm/inbox/${message.id}/convert/`);
      setFlash(
        result.created
          ? `${message.name} is now a lead.`
          : `${message.name} was already a lead — opened the existing record.`
      );
    } catch (caught) {
      setFlash(apiError(caught));
    } finally {
      setConverting(null);
    }
  };

  return (
    <>
      <PageHeading
        title="Inbox"
        description="Messages sent through the portfolio contact form. Convert anyone worth pursuing into a lead."
      />

      {error && (
        <div className="mb-4">
          <ErrorNote onRetry={refetch}>{error}</ErrorNote>
        </div>
      )}

      {flash && (
        <div className="mb-4">
          <Note tone="success">{flash}</Note>
        </div>
      )}

      {loading ? (
        <Panel>
          <LoadingPanel rows={6} label="Loading messages" />
        </Panel>
      ) : messages.length === 0 ? (
        <Panel>
          <EmptyState
            icon={InboxIcon}
            title="No messages yet"
            message="When someone fills in the contact form on your portfolio, their message appears here."
            action={
              <a
                href="/#contact"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-control border border-line-strong bg-surface px-3.5 text-body font-medium text-ink transition-colors duration-150 hover:bg-surface-sunk"
              >
                View the form
              </a>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <Panel className="overflow-hidden">
            <ul className="max-h-[34rem] divide-y divide-line overflow-y-auto">
              {messages.map((message) => (
                <li key={message.id}>
                  <button
                    onClick={() => setSelectedId(message.id)}
                    className={cx(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150',
                      selected?.id === message.id
                        ? 'bg-surface-sunk'
                        : 'hover:bg-surface-sunk'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunk text-micro font-bold text-ink-secondary ring-1 ring-line"
                    >
                      {initials(message.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-body font-semibold text-ink">
                          {message.name}
                        </p>
                        <span className="shrink-0 text-label text-ink-tertiary">
                          {relativeTime(message.submitted_at)}
                        </span>
                      </div>
                      <p className="truncate text-label text-ink-secondary">
                        {message.subject}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          {selected && (
            /* Keyed on the message so switching selections replays the
               entrance instead of silently swapping the body text. */
            <div
              key={selected.id}
              className="animate-fadeIn"
              style={{ animationDuration: '150ms' }}
            >
              <Panel>
              <header className="border-b border-line px-5 py-4">
                <h2 className="text-panel font-semibold text-ink">{selected.subject}</h2>
                <p className="mt-1 text-label text-ink-secondary">
                  {selected.name} ·{' '}
                  <a
                    href={`mailto:${selected.email}`}
                    className="underline-offset-4 hover:text-ink hover:underline"
                  >
                    {selected.email}
                  </a>
                </p>
                <p className="mt-0.5 text-label text-ink-tertiary">
                  {formatDateTime(selected.submitted_at)}
                </p>
              </header>

              <div className="px-5 py-5">
                <p className="prose-measure whitespace-pre-line text-body leading-relaxed text-ink">
                  {selected.message}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
                <Button
                  variant="secondary"
                  onClick={() => convert(selected)}
                  loading={converting === selected.id}
                >
                  <UserPlus size={14} /> Convert to lead
                </Button>
                <Link
                  to={`/dashboard/outreach/compose?to=${encodeURIComponent(selected.email)}`}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-body font-semibold text-on-accent transition-all duration-500 ease-fluid hover:bg-white active:scale-[0.98]"
                >
                  <Send size={14} /> Reply
                </Link>
              </div>
            </Panel>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Inbox;
