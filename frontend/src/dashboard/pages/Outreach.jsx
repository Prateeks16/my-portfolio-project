import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, FileEdit, Plus, Send, XCircle } from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { cx, relativeTime } from '../../lib/format';
import {
  Badge,
  EmptyState,
  ErrorNote,
  LoadingPanel,
  Note,
  Panel,
  PageHeading,
} from '../components/ui';

const FILTERS = [
  ['', 'All'],
  ['draft', 'Drafts'],
  ['sent', 'Sent'],
  ['failed', 'Failed'],
];

const STATUS = {
  draft: { tone: 'warning', icon: FileEdit, label: 'Draft' },
  scheduled: { tone: 'info', icon: Clock, label: 'Scheduled' },
  sent: { tone: 'success', icon: CheckCircle2, label: 'Sent' },
  failed: { tone: 'danger', icon: XCircle, label: 'Failed' },
};

const Outreach = () => {
  const [filter, setFilter] = useState('');
  const { data, loading, error, refetch } = useApi(
    `/crm/emails/${filter ? `?status=${filter}` : ''}`
  );
  const mail = useApi('/crm/emails/mail_status/');
  const emails = Array.isArray(data) ? data : [];

  return (
    <>
      <PageHeading
        title="Outreach"
        description="Every email you have drafted or sent, newest first."
        action={
          <Link
            to="/dashboard/outreach/compose"
            className="inline-flex h-9 items-center gap-2 rounded-control bg-ink px-3.5 text-body font-medium text-white transition-colors duration-150 hover:bg-ink-secondary"
          >
            <Plus size={15} /> Compose
          </Link>
        }
      />

      {mail.data?.configured === false && (
        <div className="mb-5">
          <Note tone="warning">
            Sending is currently off. Drafts save normally, but the send button will
            refuse until SMTP credentials are set on the backend.{' '}
            <Link to="/dashboard/settings" className="font-semibold underline">
              Set them up
            </Link>
          </Note>
        </div>
      )}

      <div role="tablist" aria-label="Filter emails" className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map(([value, label]) => (
          <button
            key={value || 'all'}
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={cx(
              'h-8 rounded-control px-3 text-label font-medium transition-colors duration-150',
              filter === value
                ? 'bg-ink text-white'
                : 'border border-line-strong bg-surface text-ink-secondary hover:bg-surface-sunk'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4">
          <ErrorNote onRetry={refetch}>{error}</ErrorNote>
        </div>
      )}

      <Panel>
        {loading ? (
          <LoadingPanel rows={6} label="Loading emails" />
        ) : emails.length === 0 ? (
          <EmptyState
            icon={Send}
            title={filter ? `No ${filter} emails` : 'No emails yet'}
            message={
              filter
                ? 'Try another filter.'
                : 'Compose your first email, or start one from a lead so the template fills in their name and company automatically.'
            }
            action={
              <Link
                to="/dashboard/outreach/compose"
                className="inline-flex h-9 items-center gap-2 rounded-control bg-ink px-3.5 text-body font-medium text-white transition-colors duration-150 hover:bg-ink-secondary"
              >
                <Plus size={15} /> Compose
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {emails.map((email) => {
              const status = STATUS[email.status] || STATUS.draft;
              const Icon = status.icon;
              return (
                <li key={email.id}>
                  <Link
                    to={`/dashboard/outreach/compose?email=${email.id}`}
                    className="flex items-start gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-sunk"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunk text-ink-secondary ring-1 ring-line"
                    >
                      <Icon size={15} strokeWidth={1.9} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-body font-semibold text-ink">
                          {email.subject || '(no subject)'}
                        </p>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-label text-ink-secondary">
                        to {email.to_name || email.to_email}
                        {email.lead_name && email.lead_name !== email.to_name
                          ? ` · ${email.lead_name}`
                          : ''}
                      </p>
                      <p className="mt-0.5 text-label text-ink-tertiary">
                        {email.status === 'sent' && email.sent_at
                          ? `Sent ${relativeTime(email.sent_at)}`
                          : `Saved ${relativeTime(email.created_at)}`}
                      </p>
                      {email.status === 'failed' && email.error_message && (
                        <p className="mt-1 text-label text-danger">{email.error_message}</p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
};

export default Outreach;
