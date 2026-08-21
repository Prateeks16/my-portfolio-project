import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  FileEdit,
  MailOpen,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { useNow } from '../../lib/useNow';
import {
  COLD_DAYS,
  NUDGE_DAYS,
  cx,
  dueLabel,
  initials,
  relativeTime,
  silenceDays,
  stageMeta,
} from '../../lib/format';
import {
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  LoadingPanel,
  Note,
  Panel,
  PanelHeader,
  SkeletonLine,
  SummaryLine,
} from '../components/ui';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const Overview = () => {
  const summary = useApi('/crm/summary/');
  const leads = useApi('/crm/leads/');
  const drafts = useApi('/crm/emails/?status=draft');

  // A ticking clock rather than a render-time Date.now(), so the queue stays
  // pure and "overdue" counts advance on their own during a long session.
  const now = useNow();

  const { overdue, dueSoon, quiet } = useMemo(() => {
    const allLeads = Array.isArray(leads.data) ? leads.data : [];
    const open = allLeads.filter((lead) => !['won', 'lost'].includes(lead.stage));
    const withFollowUp = open.filter((lead) => lead.next_follow_up_at);

    return {
      overdue: withFollowUp
        .filter((lead) => new Date(lead.next_follow_up_at).getTime() <= now)
        .sort(
          (a, b) =>
            new Date(a.next_follow_up_at) - new Date(b.next_follow_up_at)
        ),
      dueSoon: withFollowUp
        .filter((lead) => {
          const at = new Date(lead.next_follow_up_at).getTime();
          return at > now && at <= now + 7 * 86400000;
        })
        .sort(
          (a, b) =>
            new Date(a.next_follow_up_at) - new Date(b.next_follow_up_at)
        ),
      // Sent, no reply, silent past the nudge threshold. Longest wait first,
      // because that is the one closest to being unrecoverable.
      quiet: open
        .map((lead) => ({ lead, days: silenceDays(lead) }))
        .filter((row) => row.days !== null && row.days >= NUDGE_DAYS)
        .sort((a, b) => b.days - a.days)
        .map((row) => row.lead),
    };
  }, [leads.data, now]);

  const draftList = Array.isArray(drafts.data) ? drafts.data : [];
  const analytics = summary.data?.analytics;
  const inbox = summary.data?.inbox;
  const pipeline = summary.data?.pipeline;

  const viewsToday = analytics?.timeseries?.at(-1)?.views ?? 0;
  const queueLoading = leads.loading || drafts.loading;
  const queueEmpty =
    !queueLoading &&
    overdue.length === 0 &&
    dueSoon.length === 0 &&
    quiet.length === 0 &&
    draftList.length === 0;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-page font-semibold text-ink">
          {greeting()}, Prateek
        </h1>
        {summary.loading ? (
          <SkeletonLine className="mt-2.5 w-72" />
        ) : (
          <div className="mt-1.5">
            <SummaryLine
              items={[
                overdue.length > 0 && {
                  value: overdue.length,
                  label: overdue.length === 1 ? 'follow-up overdue' : 'follow-ups overdue',
                  tone: 'alert',
                },
                quiet.length > 0 && {
                  value: quiet.length,
                  label: 'need a nudge',
                  tone: 'alert',
                },
                { value: draftList.length, label: 'drafts waiting' },
                { value: pipeline?.total_leads ?? 0, label: 'leads' },
                { value: viewsToday, label: 'views today' },
              ]}
            />
          </div>
        )}
      </div>

      {summary.error && (
        <div className="mb-5">
          <ErrorNote onRetry={summary.refetch}>{summary.error}</ErrorNote>
        </div>
      )}

      {summary.data && summary.data.mail_configured === false && (
        <div className="mb-5">
          <Note tone="warning">
            Sending is off — no SMTP credentials are set on the backend. You can
            draft, store and edit everything; the send button will refuse until
            credentials exist.{' '}
            <Link to="/dashboard/settings" className="font-semibold underline">
              How to turn it on
            </Link>
          </Note>
        </div>
      )}

      {/* Split cockpit: work on the left, the signal it produced on the right. */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        {/* ------------------------------------------------------ work queue */}
        <div className="space-y-5">
          <Panel>
            <PanelHeader
              title="Work queue"
              meta="What needs you today, most urgent first"
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  loading={queueLoading}
                  onClick={() => {
                    leads.refetch();
                    drafts.refetch();
                  }}
                >
                  Refresh
                </Button>
              }
            />
            {queueLoading ? (
              <LoadingPanel rows={4} label="Loading your work queue" />
            ) : leads.error ? (
              <div className="p-4">
                <ErrorNote onRetry={leads.refetch}>{leads.error}</ErrorNote>
              </div>
            ) : queueEmpty ? (
              <EmptyState
                icon={Sparkles}
                title="Nothing is waiting on you"
                message="No follow-ups are due and no drafts are pending. Add a lead to start a new thread of outreach."
                action={
                  <Link
                    to="/dashboard/leads?new=1"
                    className="inline-flex h-9 items-center gap-2 rounded-control bg-ink px-3.5 text-body font-medium text-white transition-colors duration-150 hover:bg-ink-secondary"
                  >
                    <Plus size={14} /> Add a lead
                  </Link>
                }
              />
            ) : (
              <div>
                <QueueGroup
                  label="Overdue"
                  tone="danger"
                  items={overdue}
                  render={(lead) => (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      note={dueLabel(lead.next_follow_up_at)}
                      tone="danger"
                    />
                  )}
                />
                <QueueGroup
                  label="Due this week"
                  items={dueSoon}
                  render={(lead) => (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      note={dueLabel(lead.next_follow_up_at)}
                    />
                  )}
                />
                <QueueGroup
                  label="Drafts awaiting review"
                  items={draftList.slice(0, 6)}
                  render={(draft) => (
                    <DraftRow key={draft.id} draft={draft} />
                  )}
                />
                <QueueGroup
                  label="Needs a nudge"
                  tone={quiet.some((l) => silenceDays(l) >= COLD_DAYS) ? 'danger' : undefined}
                  items={quiet.slice(0, 6)}
                  render={(lead) => {
                    const days = silenceDays(lead);
                    return (
                      <LeadRow
                        key={lead.id}
                        lead={lead}
                        note={
                          days >= COLD_DAYS
                            ? `going cold · ${days}d silent`
                            : `${days}d silent`
                        }
                        tone={days >= COLD_DAYS ? 'danger' : undefined}
                      />
                    );
                  }}
                />
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Pipeline"
              meta="Every open lead by stage"
              action={
                <Link
                  to="/dashboard/leads"
                  className="inline-flex items-center gap-1 text-label font-semibold text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
                >
                  Open board <ArrowRight size={13} />
                </Link>
              }
            />
            {summary.loading ? (
              <div className="space-y-2 p-4">
                <SkeletonLine className="w-full" />
                <SkeletonLine className="w-4/5" />
              </div>
            ) : (
              <PipelineBar stages={pipeline?.stages || []} />
            )}
          </Panel>
        </div>

        {/* ---------------------------------------------------------- signal */}
        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Signal" meta="What your outreach produced" />
            <div className="divide-y divide-line">
              <SignalRow
                icon={Eye}
                loading={summary.loading}
                value={analytics?.total_views ?? 0}
                label="page views in 30 days"
                detail={`${analytics?.unique_visitors ?? 0} unique visitors`}
                to="/dashboard/analytics"
              />
              <SignalRow
                icon={MailOpen}
                loading={summary.loading}
                value={inbox?.total ?? 0}
                label="messages received"
                detail={
                  inbox?.recent?.length
                    ? `latest ${relativeTime(inbox.recent[0].submitted_at)}`
                    : 'none yet'
                }
                to="/dashboard/inbox"
              />
              <SignalRow
                icon={Send}
                loading={summary.loading}
                value={pipeline?.sent ?? 0}
                label="emails sent"
                detail={`${pipeline?.drafts ?? 0} still in draft`}
                to="/dashboard/outreach"
              />
            </div>
            {analytics && analytics.total_views > 0 && (
              <Sparkline series={analytics.timeseries} />
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Recent messages"
              meta="Straight from the portfolio contact form"
            />
            {summary.loading ? (
              <LoadingPanel rows={3} label="Loading messages" />
            ) : inbox?.recent?.length ? (
              <ul className="divide-y divide-line">
                {inbox.recent.map((message) => (
                  <li key={message.id}>
                    <Link
                      to="/dashboard/inbox"
                      className="block px-4 py-3 transition-colors duration-150 hover:bg-surface-sunk"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-body font-semibold text-ink">
                          {message.name}
                        </p>
                        <span className="shrink-0 text-label text-ink-tertiary">
                          {relativeTime(message.submitted_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-label text-ink-secondary">
                        {message.subject}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={MailOpen}
                title="No messages yet"
                message="Anything sent through the portfolio contact form lands here."
              />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
};

/* ------------------------------------------------------------- sub-elements */

const QueueGroup = ({ label, items, render, tone }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="border-b border-line last:border-b-0">
      <div className="flex items-center gap-2 bg-surface-sunk px-4 py-1.5">
        <span
          className={cx(
            'text-micro font-semibold uppercase',
            tone === 'danger' ? 'text-danger' : 'text-ink-tertiary'
          )}
        >
          {label}
        </span>
        <span className="tabular text-micro font-semibold text-ink-tertiary">
          {items.length}
        </span>
      </div>
      <ul className="divide-y divide-line">{items.map(render)}</ul>
    </div>
  );
};

const LeadRow = ({ lead, note, tone }) => {
  const stage = stageMeta(lead.stage);
  return (
    <li>
      <div className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-sunk">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunk text-micro font-bold text-ink-secondary ring-1 ring-line"
        >
          {initials(lead.name)}
        </span>
        <div className="min-w-0 flex-1">
          <Link
            to={`/dashboard/leads/${lead.id}`}
            className="block truncate text-body font-semibold text-ink underline-offset-4 hover:underline"
          >
            {lead.name}
            {lead.company && (
              <span className="font-normal text-ink-tertiary"> · {lead.company}</span>
            )}
          </Link>
          <p
            className={cx(
              'mt-0.5 flex items-center gap-1 text-label',
              tone === 'danger' ? 'font-semibold text-danger' : 'text-ink-tertiary'
            )}
          >
            <Clock size={11} />
            {note}
          </p>
        </div>
        <Badge tone={stage.tone}>{stage.label}</Badge>
        <Link
          to={`/dashboard/outreach/compose?lead=${lead.id}`}
          className="shrink-0 rounded-control border border-line-strong bg-surface px-2.5 py-1.5 text-label font-medium text-ink transition-colors duration-150 hover:border-ink-tertiary hover:bg-surface-sunk"
        >
          Draft
        </Link>
      </div>
    </li>
  );
};

const DraftRow = ({ draft }) => (
  <li>
    <Link
      to={`/dashboard/outreach/compose?email=${draft.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-sunk"
    >
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning-bg text-warning ring-1 ring-warning/20"
      >
        <FileEdit size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold text-ink">{draft.subject}</p>
        <p className="mt-0.5 truncate text-label text-ink-tertiary">
          to {draft.to_name || draft.to_email} · saved {relativeTime(draft.created_at)}
        </p>
      </div>
      <span className="shrink-0 rounded-control border border-line-strong bg-surface px-2.5 py-1.5 text-label font-medium text-ink">
        Review
      </span>
    </Link>
  </li>
);

const SignalRow = ({ icon: Icon, value, label, detail, to, loading }) => (
  <Link
    to={to}
    className="flex items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-sunk"
  >
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunk text-ink-secondary ring-1 ring-line"
    >
      <Icon size={16} strokeWidth={1.9} />
    </span>
    <div className="min-w-0 flex-1">
      {loading ? (
        <>
          <SkeletonLine className="w-16" />
          <SkeletonLine className="mt-2 w-24" />
        </>
      ) : (
        <>
          <p className="tabular text-body text-ink-secondary">
            <span className="text-[1.25rem] font-semibold leading-none text-ink">
              {value}
            </span>{' '}
            {label}
          </p>
          <p className="mt-1 text-label text-ink-tertiary">{detail}</p>
        </>
      )}
    </div>
    <ArrowRight size={14} className="shrink-0 text-ink-tertiary" />
  </Link>
);

const PipelineBar = ({ stages }) => {
  const open = stages.filter((stage) => !['won', 'lost'].includes(stage.stage));
  const total = open.reduce((sum, stage) => sum + stage.count, 0);

  if (total === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No leads yet"
        message="Add someone you want to reach, or convert a contact-form message into a lead."
      />
    );
  }

  return (
    <div className="p-4">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-line">
        {open.map((stage, index) =>
          stage.count > 0 ? (
            <span
              key={stage.stage}
              title={`${stage.label}: ${stage.count}`}
              style={{
                width: `${(stage.count / total) * 100}%`,
                // A single ink ramp: later stages read darker, so progress is legible
                // without assigning a decorative colour to every stage.
                backgroundColor: `color-mix(in srgb, #171512 ${25 + index * 15}%, #CFC7BC)`,
              }}
            />
          ) : null
        )}
      </div>
      <ul className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {stages.map((stage) => (
          <li key={stage.stage} className="flex items-baseline justify-between gap-2">
            <Link
              to={`/dashboard/leads?stage=${stage.stage}`}
              className="truncate text-label text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
            >
              {stage.label}
            </Link>
            <span className="tabular text-label font-semibold text-ink">
              {stage.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Thirty days of traffic, drawn as a filled area. Content, not decoration. */
const Sparkline = ({ series }) => {
  if (!series?.length) return null;
  const values = series.map((point) => point.views);
  const max = Math.max(...values, 1);
  const width = 300;
  const height = 44;
  const step = width / Math.max(values.length - 1, 1);
  const points = values.map((value, index) => [
    index * step,
    height - (value / max) * (height - 4) - 2,
  ]);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <div className="border-t border-line px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-micro font-semibold uppercase text-ink-tertiary">
          Last 30 days
        </span>
        <span className="tabular text-label text-ink-tertiary">peak {max}/day</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="mt-2 h-11 w-full"
        role="img"
        aria-label={`Page views over the last 30 days, peaking at ${max} in a day`}
      >
        <polygon points={area} fill="#171512" opacity="0.07" />
        <polyline
          points={line}
          fill="none"
          stroke="#171512"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};

export default Overview;
