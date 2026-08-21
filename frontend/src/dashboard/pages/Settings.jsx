import React from 'react';
import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { relativeTime } from '../../lib/format';
import { API_BASE_URL } from '../../api';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { Note, Panel, PanelHeader, PageHeading } from '../components/ui';

const ENV_VARS = [
  ['EMAIL_HOST', 'smtp.gmail.com', 'SMTP server for your provider.'],
  ['EMAIL_PORT', '587', 'TLS submission port.'],
  ['EMAIL_USE_TLS', 'True', 'Leave as True for port 587.'],
  ['EMAIL_HOST_USER', 'you@gmail.com', 'The address emails are sent from.'],
  [
    'EMAIL_HOST_PASSWORD',
    'app password',
    'For Gmail this must be a 16-character App Password, never your account password.',
  ],
  ['DEFAULT_FROM_EMAIL', 'you@gmail.com', 'Optional — defaults to EMAIL_HOST_USER.'],
];

const Settings = () => {
  const { username } = useAuth();
  const mail = useApi('/crm/emails/mail_status/');
  const ingest = useApi('/crm/ingest-status/');
  const configured = mail.data?.configured;

  return (
    <>
      <PageHeading
        title="Settings"
        description="How this dashboard is wired up, and what to change where."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Email sending" meta="Controls whether Send actually transmits" />
          <div className="p-4">
            {mail.loading ? (
              <p className="text-body text-ink-tertiary">Checking…</p>
            ) : configured ? (
              <div className="flex items-start gap-2.5 rounded-control border border-success/25 bg-success-bg px-3.5 py-3">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
                <p className="text-body leading-relaxed text-success">
                  Sending is live. SMTP credentials are set, so the Send button will
                  transmit real email from your address.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-control border border-warning/25 bg-warning-bg px-3.5 py-3">
                <XCircle size={16} className="mt-0.5 shrink-0 text-warning" />
                <p className="text-body leading-relaxed text-warning">
                  Sending is off. Drafting, editing and storing all work normally, but
                  Send will refuse and keep the draft instead. Nothing can leave your
                  account by accident while it is in this state.
                </p>
              </div>
            )}

            <h3 className="mb-2 mt-5 text-label font-semibold text-ink">
              To turn sending on
            </h3>
            <p className="prose-measure mb-3 text-body leading-relaxed text-ink-secondary">
              Add these environment variables to the backend service on Render, then
              redeploy. They are never stored in the repository and never sent to the
              browser.
            </p>
            <dl className="divide-y divide-line rounded-control border border-line">
              {ENV_VARS.map(([key, example, note]) => (
                <div key={key} className="px-3.5 py-2.5">
                  <dt className="flex flex-wrap items-baseline gap-2">
                    <code className="rounded bg-surface-sunk px-1.5 py-0.5 text-label font-semibold text-ink">
                      {key}
                    </code>
                    <span className="text-label text-ink-tertiary">= {example}</span>
                  </dt>
                  <dd className="mt-1 text-label leading-relaxed text-ink-secondary">
                    {note}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-3">
              <Note tone="warning">
                Use an App Password, not your real Gmail password, and treat it like a
                key: anyone with it can send mail as you.
              </Note>
            </div>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <PanelHeader
              title="Job scan ingest"
              meta="Whether the weekday scan can write into the pipeline"
            />
            <div className="p-4">
              {ingest.loading ? (
                <p className="text-body text-ink-tertiary">Checking…</p>
              ) : ingest.data?.configured ? (
                <div className="flex items-start gap-2.5 rounded-control border border-success/25 bg-success-bg px-3.5 py-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
                  <p className="text-body leading-relaxed text-success">
                    Ingest token is set. The scan can post postings straight onto the
                    board.
                    {ingest.data.scanned_leads > 0 ? (
                      <>
                        {' '}
                        {ingest.data.scanned_leads} scanned lead
                        {ingest.data.scanned_leads === 1 ? '' : 's'} so far, most recent{' '}
                        {relativeTime(ingest.data.last_ingest_at)}.
                      </>
                    ) : (
                      ' Nothing has arrived yet — the first run will change that.'
                    )}
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-control border border-warning/25 bg-warning-bg px-3.5 py-3">
                  <XCircle size={16} className="mt-0.5 shrink-0 text-warning" />
                  <p className="text-body leading-relaxed text-warning">
                    No ingest token set, so the endpoint refuses everything. Add
                    <code className="mx-1 rounded bg-warning/10 px-1 py-0.5 text-label font-semibold">
                      CRM_INGEST_TOKEN
                    </code>
                    to the backend environment and use the same value in the scheduled
                    task.
                  </p>
                </div>
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Connection" />
            <dl className="divide-y divide-line text-body">
              {[
                ['Signed in as', username || '—'],
                ['API base', API_BASE_URL.replace(/^https?:\/\//, '')],
                ['Auth', 'JWT bearer token, 12-hour access, 14-day refresh'],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-wrap justify-between gap-2 px-4 py-3">
                  <dt className="text-label text-ink-tertiary">{label}</dt>
                  <dd className="text-label font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel>
            <PanelHeader title="Analytics privacy" meta="What is and is not collected" />
            <div className="prose-measure space-y-2.5 p-4 text-body leading-relaxed text-ink-secondary">
              <p>
                Page views are recorded with a path, a referrer, a coarse device type,
                and a random session id generated in the visitor's browser for that tab
                only.
              </p>
              <p>
                No cookies are set, no IP address is stored, and there is no
                fingerprinting or third-party script. Nothing leaves your own backend.
              </p>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Django admin" meta="For anything this dashboard does not cover" />
            <div className="p-4">
              <a
                href={`${API_BASE_URL}/admin/`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-control border border-line-strong bg-surface px-3.5 text-body font-medium text-ink transition-colors duration-150 hover:bg-surface-sunk"
              >
                Open Django admin <ExternalLink size={13} />
              </a>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
};

export default Settings;
