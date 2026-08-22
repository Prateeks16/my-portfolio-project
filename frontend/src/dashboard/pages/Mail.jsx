import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  AtSign,
  Paperclip,
  RefreshCw,
  Send,
  UserPlus,
} from 'lucide-react';
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
  Textarea,
} from '../components/ui';

/**
 * Real email, mirrored from Gmail.
 *
 * Gmail remains the mailbox. This screen never marks anything read there,
 * never archives there and never deletes -- it holds its own flags so the CRM
 * can be triaged without disturbing the inbox on the phone. Replies go out
 * over the same account, threaded, and land in Gmail's Sent folder like
 * anything else sent from the address.
 */

/** How old the last sync must be before opening the page triggers another. */
const STALE_MS = 3 * 60 * 1000;

const Mail = () => {
  const [showArchived, setShowArchived] = useState(false);
  const listUrl = `/crm/mail/${showArchived ? '?archived=true' : ''}`;

  const { data, loading, error, refetch } = useApi(listUrl);
  const { data: status, refetch: refetchStatus } = useApi('/crm/mail/sync_status/');

  const [selectedId, setSelectedId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [flash, setFlash] = useState(null);

  const messages = Array.isArray(data) ? data : [];
  const selected = messages.find((m) => m.id === selectedId) || messages[0];

  // The row carries no body, so the full message is a second, cached request.
  const { data: detail } = useApi(selected ? `/crm/mail/${selected.id}/` : null, {
    skip: !selected,
  });

  const refreshAll = useCallback(() => {
    refetch();
    refetchStatus();
  }, [refetch, refetchStatus]);

  const sync = useCallback(
    async ({ quiet = false } = {}) => {
      setSyncing(true);
      if (!quiet) setFlash(null);
      try {
        const { data: log } = await api.post('/crm/mail/sync/');
        if (!quiet || log.created) {
          setFlash(
            log.created
              ? `${log.created} new message${log.created === 1 ? '' : 's'}.`
              : 'No new mail.'
          );
        }
        refreshAll();
      } catch (caught) {
        // A background sync that fails stays quiet; the page still has whatever
        // was fetched last time, and the Sync button reports properly.
        if (!quiet) setFlash(apiError(caught));
      } finally {
        setSyncing(false);
      }
    },
    [refreshAll]
  );

  /* Opening the page is the intent to see current mail, so it fetches once on
     arrival rather than waiting for the button -- but only if the last run is
     old enough to be worth a round trip. */
  const autoSynced = useRef(false);
  useEffect(() => {
    if (autoSynced.current || !status?.configured) return;
    const last = status.last_sync?.started_at;
    if (last && Date.now() - new Date(last).getTime() < STALE_MS) return;
    autoSynced.current = true;
    sync({ quiet: true });
  }, [status, sync]);

  return (
    <>
      <PageHeading
        title="Mail"
        description="Your Gmail inbox, mirrored here. Reading and archiving in the CRM never changes anything in Gmail."
        action={
          <Button variant="secondary" icon={RefreshCw} onClick={() => sync()} loading={syncing}>
            Sync
          </Button>
        }
      />

      {status && !status.configured && (
        <div className="mb-4">
          <Note tone="warning">
            Receiving is off. Set <code>EMAIL_HOST_USER</code> and{' '}
            <code>EMAIL_HOST_PASSWORD</code> in the backend environment, and turn on
            IMAP in Gmail under Settings → Forwarding and POP/IMAP.
          </Note>
        </div>
      )}

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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={showArchived ? 'ghost' : 'secondary'}
          onClick={() => {
            setShowArchived(false);
            setSelectedId(null);
          }}
        >
          Inbox{status?.unread ? ` · ${status.unread}` : ''}
        </Button>
        <Button
          size="sm"
          variant={showArchived ? 'secondary' : 'ghost'}
          onClick={() => {
            setShowArchived(true);
            setSelectedId(null);
          }}
        >
          Archived
        </Button>
        {status?.last_sync?.started_at && (
          <span className="ml-auto text-label text-ink-tertiary">
            Last synced {relativeTime(status.last_sync.started_at)}
          </span>
        )}
      </div>

      {loading ? (
        <Panel>
          <LoadingPanel rows={6} label="Loading mail" />
        </Panel>
      ) : messages.length === 0 ? (
        <Panel>
          <EmptyState
            icon={AtSign}
            title={showArchived ? 'Nothing archived' : 'No mail yet'}
            message={
              showArchived
                ? 'Messages you archive here are hidden from the inbox but stay in Gmail.'
                : 'Press Sync to pull recent messages from Gmail. Replies to your outreach are matched to their lead automatically.'
            }
            action={
              !showArchived && (
                <Button variant="secondary" icon={RefreshCw} onClick={() => sync()} loading={syncing}>
                  Sync now
                </Button>
              )
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
                      {initials(message.from_name || message.from_email)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          className={cx(
                            'truncate text-body text-ink',
                            message.is_read ? 'font-medium' : 'font-bold'
                          )}
                        >
                          {message.from_name || message.from_email}
                        </p>
                        <span className="shrink-0 text-label text-ink-tertiary">
                          {relativeTime(message.sent_at)}
                        </span>
                      </div>
                      <p className="truncate text-label text-ink-secondary">
                        {message.subject || '(no subject)'}
                      </p>
                      <p className="truncate text-label text-ink-tertiary">
                        {message.snippet}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        {!message.is_read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-info" />
                        )}
                        {message.lead_name && (
                          <span className="truncate text-micro text-ink-tertiary">
                            {message.lead_name}
                          </span>
                        )}
                        {message.has_attachments && (
                          <Paperclip size={11} className="text-ink-tertiary" />
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          {selected && (
            <MessageView
              key={selected.id}
              summary={selected}
              detail={detail && detail.id === selected.id ? detail : null}
              onChanged={refreshAll}
              onFlash={setFlash}
            />
          )}
        </div>
      )}
    </>
  );
};

const MessageView = ({ summary, detail, onChanged, onFlash }) => {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(null);

  const message = detail || summary;

  const act = async (name, request) => {
    setBusy(name);
    onFlash(null);
    try {
      await request();
      onChanged();
    } catch (caught) {
      onFlash(apiError(caught));
    } finally {
      setBusy(null);
    }
  };

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    onFlash(null);
    try {
      // `send: true` transmits immediately; without it the reply is only
      // drafted. Threading headers are attached on the server.
      await api.post(`/crm/mail/${message.id}/reply/`, { body: reply, send: true });
      setReply('');
      onFlash('Reply sent. It is in your Gmail Sent folder too.');
      onChanged();
    } catch (caught) {
      onFlash(apiError(caught));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="animate-fadeIn" style={{ animationDuration: '150ms' }}>
      <Panel>
        <header className="border-b border-line px-5 py-4">
          <h2 className="text-panel font-semibold text-ink">
            {message.subject || '(no subject)'}
          </h2>
          <p className="mt-1 text-label text-ink-secondary">
            {message.from_name || message.from_email} ·{' '}
            <a
              href={`mailto:${message.from_email}`}
              className="underline-offset-4 hover:text-ink hover:underline"
            >
              {message.from_email}
            </a>
          </p>
          <p className="mt-0.5 text-label text-ink-tertiary">
            {formatDateTime(message.sent_at)}
          </p>
          {message.lead && (
            <Link
              to={`/dashboard/leads/${message.lead}`}
              className="mt-2 inline-block text-label text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
            >
              Linked to {message.lead_name || 'a lead'}
            </Link>
          )}
        </header>

        <div className="px-5 py-5">
          {detail ? (
            <p className="prose-measure whitespace-pre-line text-body leading-relaxed text-ink">
              {detail.body_text || detail.snippet}
            </p>
          ) : (
            <LoadingPanel rows={4} label="Loading message" />
          )}
        </div>

        <div className="border-t border-line px-5 py-4">
          <Textarea
            rows={4}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder={`Reply to ${message.from_name || message.from_email}…`}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button icon={Send} onClick={send} loading={sending} disabled={!reply.trim()}>
              Send reply
            </Button>
            {!message.lead && (
              <Button
                variant="secondary"
                icon={UserPlus}
                loading={busy === 'convert'}
                onClick={() =>
                  act('convert', () => api.post(`/crm/mail/${message.id}/convert/`))
                }
              >
                Convert to lead
              </Button>
            )}
            <Button
              variant="ghost"
              loading={busy === 'read'}
              onClick={() =>
                act('read', () =>
                  api.post(`/crm/mail/${message.id}/read/`, {
                    is_read: !message.is_read,
                  })
                )
              }
            >
              Mark {message.is_read ? 'unread' : 'read'}
            </Button>
            <Button
              variant="ghost"
              icon={Archive}
              loading={busy === 'archive'}
              onClick={() =>
                act('archive', () =>
                  api.post(`/crm/mail/${message.id}/archive/`, {
                    is_archived: !message.is_archived,
                  })
                )
              }
            >
              {message.is_archived ? 'Unarchive' : 'Archive'}
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
};

export default Mail;
