import React, { useMemo } from 'react';
import { cx, STAGES } from '../../lib/format';
import { EmptyState, Panel, PanelHeader } from './ui';

/* Order the funnel walks. 'won' and 'lost' are outcomes, not steps, so they are
   reported separately rather than as another bar that always looks like a cliff. */
const FUNNEL = ['new', 'contacted', 'applied', 'replied', 'interviewing', 'offer'];

const SOURCE_LABELS = {
  job_scan: 'Automated job scan',
  portfolio: 'Portfolio contact form',
  linkedin: 'LinkedIn',
  referral: 'Referral',
  job_board: 'Job board',
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

    return {
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

export default PipelineInsights;
