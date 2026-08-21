import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApi } from '../../lib/useApi';
import { cx } from '../../lib/format';
import {
  EmptyState,
  ErrorNote,
  LoadingPanel,
  Note,
  Panel,
  PanelHeader,
  PageHeading,
  SummaryLine,
} from '../components/ui';

const RANGES = [
  [7, '7 days'],
  [30, '30 days'],
  [90, '90 days'],
];

const Analytics = () => {
  const [days, setDays] = useState(30);
  const { data, loading, error, refetch } = useApi(`/crm/analytics/?days=${days}`);

  const hasData = data && data.total_views > 0;

  return (
    <>
      <PageHeading
        title="Analytics"
        description="First-party traffic for your portfolio. No cookies, no third-party trackers, no IP addresses stored."
      />

      <div role="tablist" aria-label="Date range" className="mb-4 flex gap-1.5">
        {RANGES.map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={days === value}
            onClick={() => setDays(value)}
            className={cx(
              'h-8 rounded-control px-3 text-label font-medium transition-colors duration-150',
              days === value
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

      {loading ? (
        <Panel>
          <LoadingPanel rows={6} label="Loading analytics" />
        </Panel>
      ) : !hasData ? (
        <Panel>
          <EmptyState
            icon={BarChart3}
            title="No traffic recorded yet"
            message="Tracking starts the moment the new portfolio is deployed — there is no historical data to backfill. Visits will appear here within seconds of the first person landing on the site."
          />
        </Panel>
      ) : (
        <div className="space-y-5">
          <div className="mb-1">
            <SummaryLine
              items={[
                { value: data.total_views, label: 'page views' },
                { value: data.unique_visitors, label: 'unique visitors' },
                {
                  value: Math.round((data.total_views / days) * 10) / 10,
                  label: 'views per day',
                },
              ]}
            />
          </div>

          <Panel>
            <PanelHeader title="Traffic" meta={`Page views over the last ${days} days`} />
            <div className="p-4 pt-5">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={data.timeseries}
                  margin={{ top: 4, right: 8, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="views" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#171512" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#171512" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E3DED6" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })
                    }
                    tick={{ fill: '#6B6259', fontSize: 11 }}
                    axisLine={{ stroke: '#E3DED6' }}
                    tickLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#6B6259', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    cursor={{ stroke: '#CFC7BC', strokeWidth: 1 }}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #E3DED6',
                      boxShadow: '0 12px 32px -8px rgba(23,21,18,0.22)',
                      fontSize: 13,
                      fontFamily: 'Manrope, sans-serif',
                      color: '#171512',
                    }}
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'long',
                      })
                    }
                    formatter={(value) => [value, 'views']}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#171512"
                    strokeWidth={1.75}
                    fill="url(#views)"
                    activeDot={{ r: 4, fill: '#171512' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <BreakdownPanel
              title="Top pages"
              meta="Where visitors landed"
              rows={data.top_pages}
              labelKey="path"
            />
            <BreakdownPanel
              title="Referrers"
              meta="Where they came from"
              rows={data.referrers}
              labelKey="referrer"
              empty="Everyone arrived directly, with no referring site."
            />
            <BreakdownPanel
              title="Devices"
              meta="How they were reading"
              rows={data.devices}
              labelKey="device"
            />
            <BreakdownPanel
              title="Interactions"
              meta="Named events — resume opened, demo clicked, and so on"
              rows={data.events}
              labelKey="name"
              empty="No interactions tracked yet."
            />
          </div>
        </div>
      )}
    </>
  );
};

const BreakdownPanel = ({ title, meta, rows, labelKey, empty }) => {
  const list = Array.isArray(rows) ? rows : [];
  const max = Math.max(...list.map((row) => row.count), 1);

  return (
    <Panel>
      <PanelHeader title={title} meta={meta} />
      {list.length === 0 ? (
        <p className="px-4 py-8 text-center text-body text-ink-tertiary">
          {empty || 'Nothing recorded yet.'}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {list.map((row) => {
            const label = row[labelKey] || '—';
            return (
              <li key={label} className="px-4 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-body text-ink" title={label}>
                    {label}
                  </span>
                  <span className="tabular shrink-0 text-label font-semibold text-ink">
                    {row.count}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-1 rounded-full bg-ink/15"
                  style={{ width: `${(row.count / max) * 100}%` }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
};

export default Analytics;
