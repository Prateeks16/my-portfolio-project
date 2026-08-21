import React, { useMemo } from 'react';
import {
  COLD_DAYS,
  NUDGE_DAYS,
  STAGES,
  cx,
  hasReplied,
  isOpen,
  silenceDays,
  wasSent,
} from '../../lib/format';
import { EmptyState, Panel, PanelHeader, SummaryLine } from './ui';

/* Order the funnel walks. 'won' and 'lost' are outcomes, not steps, so they are
   reported separately rather than as another bar that always looks like a cliff. */
const FUNNEL = ['new', 'contacted', 'applied', 'replied', 'interviewing', 'offer'];

const SOURCE_LABELS = {
  job_scan: 'Automated job scan',
  portfolio: 'Portfolio contact form',
  linkedin: 'LinkedIn',
  referral: 'Referral',
  job_board: 'Job board',
  application_form: 'Application form',
  github: 'GitHub',
  email: 'Inbound email',
  manual: 'Added by hand',
  other: 'Other',
};

/**
 * Everything here is derived from the leads already in memory, so switching to
 * this view costs no request. Counting is cumulative: a lead at 'interviewing'
 * has necessarily passed through 'contacted', so it counts toward both.
 */
const PipelineInsights = ({ leads }) => {
  const stats = useMemo(() => {
    const rank = Object.fromEntries(STAGES.map((s, i) => [s.key, i]));
    const reached = Object.fromEntries(FUNNEL.map((k) => [k, 0]));

    const bySource = new Map();
    const byStack = new Map();
    let won = 0;
    let lost = 0;

    leads.forEach((lead) => {
      if (lead.stage === 'won') won += 1;
      if (lead.stage === 'lost') lost += 1;

      // A lost lead's rank says nothing about how far it actually got — it may
      // have died at first contact. Crediting it every step would inflate the
      // funnel, so lost leads are reported as an outcome and left out of it.
      if (lead.stage !== 'lost') {
        const position = rank[lead.stage] ?? 0;
        FUNNEL.forEach((key) => {
          if (rank[key] <= position) reached[key] += 1;
        });
      }

      const source = lead.source || 'other';
      const entry = bySource.get(source) || { total: 0, replied: 0 };
      entry.total += 1;
      if (rank[lead.stage] >= rank.replied && lead.stage !== 'lost') entry.replied += 1;
      bySource.set(source, entry);

      (lead.tag_list || []).forEach((tag) => {
        const key = tag.trim();
        if (key) byStack.set(key, (byStack.get(key) || 0) + 1);
      });
    });

    const sent = leads.filter(wasSent);
    const replied = sent.filter(hasReplied);
    const replyLags = leads
      .filter((l) => l.replied_at && l.last_contacted_at)
      .map((l) =>
        Math.max(
          0,
          Math.round(
            (new Date(l.replied_at) - new Date(l.last_contacted_at)) / 86400000
          )
        )
      );
    const nudges = leads.filter((l) => {
      const d = silenceDays(l);
      return d !== null && d >= NUDGE_DAYS;
    });

    // Outbound volume per day, from when each lead was last contacted.
    const perDay = new Map();
    sent.forEach((l) => {
      if (!l.last_contacted_at) return;
      const day = new Date(l.last_contacted_at).toISOString().slice(0, 10);
      perDay.set(day, (perDay.get(day) || 0) + 1);
    });

    return {
      sentCount: sent.length,
      repliedCount: replied.length,
      responseRate: sent.length ? Math.round((replied.length / sent.length) * 100) : 0,
      avgReplyDays: replyLags.length
        ? (replyLags.reduce((a, b) => a + b, 0) / replyLags.length).toFixed(1)
        : null,
      nudges: nudges.length,
      cold: nudges.filter((l) => silenceDays(l) >= COLD_DAYS).length,
      openCount: leads.filter(isOpen).length,
      timeline: [...perDay.entries()].sort().map(([date, count]) => ({ date, count })),
      funnel: FUNNEL.map((key) => ({
        key,
        label: STAGES.find((s) => s.key === key).label,
        count: reached[key],
      })),
      sources: [...bySource.entries()]
        .map(([key, value]) => ({ key, ...value }))
        .sort((a, b) => b.total - a.total),
      stack: [...byStack.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12),
      won,
      lost,
      total: leads.length,
    };
  }, [leads]);

  if (stats.total === 0) {
    return (
      <Panel>
        <EmptyState
          title="Nothing to analyse yet"
          message="Add leads, or let the weekday job scan fill the board, and the funnel appears here."
        />
      </Panel>
    );
  }

  const top = stats.funnel[0]?.count || 1;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <SummaryLine
          items={[
            { value: stats.openCount, label: 'open' },
            { value: stats.sentCount, label: 'sent' },
            { value: `${stats.responseRate}%`, label: 'response rate' },
            stats.avgReplyDays !== null && {
              value: stats.avgReplyDays,
              label: 'avg days to reply',
            },
            stats.nudges > 0 && {
              value: stats.nudges,
              label: stats.cold > 0 ? `need a nudge (${stats.cold} cold)` : 'need a nudge',
              tone: 'alert',
            },
          ]}
        />
        <p className="mt-2 max-w-2xl text-label leading-relaxed text-ink-tertiary">
          Response rate counts anything that reached Replied or beyond, over
          everything sent. With a pipeline this size one reply moves it a lot —
          read the trend, not the decimal.
        </p>
      </div>

      <Panel className="lg:col-span-2">
        <PanelHeader
          title="Funnel"
          meta="How far leads get, and what each step costs you"
        />
        <ol className="divide-y divide-line">
          {stats.funnel.map((step, index) => {
            const previous = index === 0 ? null : stats.funnel[index - 1].count;
            const rate =
              previous && previous > 0 ? Math.round((step.count / previous) * 100) : null;
            return (
              <li key={step.key} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-body font-medium text-ink">{step.label}</span>
                  <span className="tabular text-label text-ink-tertiary">
                    <span className="font-semibold text-ink">{step.count}</span>
                    {rate !== null && ` · ${rate}% from previous`}
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-ink transition-[width] duration-300 ease-out"
                    style={{ width: `${(step.count / top) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
        <div className="flex gap-6 border-t border-line px-4 py-3 text-label">
          <span className="text-ink-secondary">
            Won <span className="tabular font-semibold text-success">{stats.won}</span>
          </span>
          <span className="text-ink-secondary">
            Lost <span className="tabular font-semibold text-ink">{stats.lost}</span>
          </span>
          <span className="text-ink-secondary">
            Open{' '}
            <span className="tabular font-semibold text-ink">
              {stats.total - stats.won - stats.lost}
            </span>
          </span>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Channels"
          meta="Which routes actually get a reply, not just volume"
        />
        <ul className="divide-y divide-line">
          {stats.sources.map((source) => {
            const rate = source.total ? Math.round((source.replied / source.total) * 100) : 0;
            return (
              <li key={source.key} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-body text-ink">
                    {SOURCE_LABELS[source.key] || source.key}
                  </span>
                  <span className="tabular shrink-0 text-label text-ink-tertiary">
                    {source.replied}/{source.total} replied
                  </span>
                </div>
                <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className={cx('h-full', rate > 0 ? 'bg-success' : 'bg-line-strong')}
                    style={{ width: `${rate}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel className="lg:col-span-2">
        <PanelHeader title="Activity" meta="Outreach and applications sent per day" />
        <Timeline points={stats.timeline} />
      </Panel>

      <Panel>
        <PanelHeader
          title="Stack demand"
          meta="What the roles on your board are asking for"
        />
        {stats.stack.length === 0 ? (
          <p className="px-4 py-8 text-center text-body text-ink-tertiary">
            No tags yet. The job scan fills these from each posting.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {stats.stack.map((item) => (
              <li key={item.name} className="px-4 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-body text-ink">
                    {item.name}
                  </span>
                  <span className="tabular shrink-0 text-label font-semibold text-ink">
                    {item.count}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-1 rounded-full bg-ink/15"
                  style={{ width: `${(item.count / stats.stack[0].count) * 100}%` }}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};

/** Outbound volume per day. Bars, not a line: these are discrete events. */
const Timeline = ({ points }) => {
  if (!points.length) {
    return (
      <p className="px-4 py-8 text-center text-body text-ink-tertiary">
        No send dates recorded yet.
      </p>
    );
  }

  // Fill the gaps so quiet days read as quiet rather than being skipped.
  const first = new Date(points[0].date);
  const last = new Date(points[points.length - 1].date);
  const days = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: points.find((p) => p.date === key)?.count || 0 });
  }

  const max = Math.max(...days.map((d) => d.count), 1);
  const label = (iso) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <div className="px-4 py-4">
      <div className="flex h-28 items-end gap-1" role="img"
           aria-label={`Outreach per day from ${label(days[0].date)} to ${label(days[days.length - 1].date)}, peaking at ${max}`}>
        {days.map((day) => (
          <div key={day.date} className="group relative flex-1" title={`${label(day.date)}: ${day.count}`}>
            <div
              className={cx(
                'w-full rounded-sm transition-colors',
                day.count ? 'bg-ink group-hover:bg-ink-secondary' : 'bg-line'
              )}
              style={{ height: day.count ? `${(day.count / max) * 100}%` : '2px' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-label text-ink-tertiary">
        <span>{label(days[0].date)}</span>
        <span className="tabular">peak {max}/day</span>
        <span>{label(days[days.length - 1].date)}</span>
      </div>
    </div>
  );
};

export default PipelineInsights;
