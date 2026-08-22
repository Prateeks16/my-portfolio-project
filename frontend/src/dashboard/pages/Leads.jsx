import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3, ExternalLink, LayoutGrid, List, Plus, Search, Users } from 'lucide-react';
import api from '../../api';
import { useApi, apiError } from '../../lib/useApi';
import { STAGES, SOURCES, cx, formatDate, initials, relativeTime, stageMeta } from '../../lib/format';
import {
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  LoadingPanel,
  Modal,
  Panel,
  PageHeading,
  Select,
  Textarea,
} from '../components/ui';
import PipelineInsights from '../components/PipelineInsights';

const BLANK = {
  name: '',
  email: '',
  company: '',
  role: '',
  linkedin_url: '',
  location: '',
  stage: 'new',
  source: 'manual',
  score: 50,
  tags: '',
  notes: '',
};

const Leads = () => {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState('board');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(params.get('new') === '1');
  const [movingId, setMovingId] = useState(null);

  const stageFilter = params.get('stage') || '';
  const url = useMemo(() => {
    const qs = new URLSearchParams();
    if (stageFilter) qs.set('stage', stageFilter);
    if (query) qs.set('search', query);
    const suffix = qs.toString();
    return `/crm/leads/${suffix ? `?${suffix}` : ''}`;
  }, [stageFilter, query]);

  const { data, loading, error, refetch, setData } = useApi(url);
  const leads = Array.isArray(data) ? data : [];

  // Debounce so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const moveStage = async (lead, stage) => {
    if (lead.stage === stage) return;
    const previous = leads;
    setMovingId(lead.id);
    setData(leads.map((row) => (row.id === lead.id ? { ...row, stage } : row)));
    try {
      await api.patch(`/crm/leads/${lead.id}/`, { stage });
    } catch (caught) {
      setData(previous);
      window.alert(apiError(caught));
    } finally {
      // Let the settle animation finish before dropping the marker.
      setTimeout(() => setMovingId(null), 420);
    }
  };

  const setStageFilter = (stage) => {
    const next = new URLSearchParams(params);
    if (stage) next.set('stage', stage);
    else next.delete('stage');
    next.delete('new');
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeading
        title="Leads"
        description="Everyone you are reaching out to, and where each conversation has got to."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus size={15} /> Add lead
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[13rem] flex-1 sm:max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, company, role, tag"
            className="pl-9"
            aria-label="Search leads"
          />
        </div>

        <Select
          value={stageFilter}
          onChange={(event) => setStageFilter(event.target.value)}
          aria-label="Filter by stage"
          className="w-auto"
        >
          <option value="">All stages</option>
          {STAGES.map((stage) => (
            <option key={stage.key} value={stage.key}>
              {stage.label}
            </option>
          ))}
        </Select>

        <div
          role="group"
          aria-label="View mode"
          className="ml-auto flex overflow-hidden rounded-control border border-line-strong"
        >
          {[
            ['board', LayoutGrid, 'Board'],
            ['table', List, 'Table'],
            ['insights', BarChart3, 'Insights'],
          ].map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={cx(
                'inline-flex h-9 items-center gap-1.5 px-3 text-label font-medium transition-colors duration-150',
                view === key
                  ? 'bg-ink text-on-accent'
                  : 'bg-surface text-ink-secondary hover:bg-surface-sunk'
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorNote onRetry={refetch}>{error}</ErrorNote>
        </div>
      )}

      {loading ? (
        <Panel>
          <LoadingPanel rows={6} label="Loading leads" />
        </Panel>
      ) : leads.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Users}
            title={query || stageFilter ? 'No leads match that' : 'No leads yet'}
            message={
              query || stageFilter
                ? 'Try a different search, or clear the stage filter.'
                : 'Add the first person you want to reach. Messages from the portfolio contact form can also be converted into leads from the Inbox.'
            }
            action={
              query || stageFilter ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setStageFilter('');
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => setCreating(true)}>
                  <Plus size={15} /> Add lead
                </Button>
              )
            }
          />
        </Panel>
      ) : view === 'board' ? (
        <Board leads={leads} onMove={moveStage} movingId={movingId} />
      ) : view === 'insights' ? (
        <PipelineInsights leads={leads} />
      ) : (
        <LeadTable leads={leads} />
      )}

      <CreateLead
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          refetch();
        }}
      />
    </>
  );
};

/* ------------------------------------------------------------------- board */

const Board = ({ leads, onMove, movingId }) => (
  <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
    <div className="flex min-w-max gap-3.5">
      {STAGES.map((stage) => {
        const column = leads.filter((lead) => lead.stage === stage.key);
        return (
          <section key={stage.key} className="w-[16.5rem] shrink-0">
            <header className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-micro font-semibold uppercase text-ink-secondary">
                {stage.label}
              </h2>
              <span className="tabular text-micro font-semibold text-ink-tertiary">
                {column.length}
              </span>
            </header>
            <div className="min-h-[5rem] space-y-2 rounded-panel bg-line/35 p-2">
              {column.length === 0 ? (
                <p className="px-2 py-5 text-center text-label text-ink-tertiary">
                  Nothing here
                </p>
              ) : (
                column.map((lead) => (
                  <BoardCard
                    key={lead.id}
                    lead={lead}
                    onMove={onMove}
                    settling={movingId === lead.id}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  </div>
);

const BoardCard = ({ lead, onMove, settling }) => (
  <article
    className={cx(
      'rounded-control border border-line bg-surface p-3 shadow-row transition-shadow duration-150',
      settling && 'animate-stageSettle'
    )}
  >
    <div className="flex items-start gap-2.5">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-sunk text-micro font-bold text-ink-secondary ring-1 ring-line"
      >
        {initials(lead.name)}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          to={`/dashboard/leads/${lead.id}`}
          className="block truncate text-body font-semibold text-ink underline-offset-4 hover:underline"
        >
          {lead.name}
        </Link>
        {lead.company && (
          <p className="truncate text-label text-ink-secondary">{lead.company}</p>
        )}
        {lead.role && (
          <p className="truncate text-label text-ink-tertiary">{lead.role}</p>
        )}
      </div>
    </div>

    {lead.tag_list?.length > 0 && (
      <div className="mt-2.5 flex flex-wrap gap-1">
        {lead.tag_list.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-surface-sunk px-1.5 py-0.5 text-micro font-medium text-ink-tertiary ring-1 ring-line"
          >
            {tag}
          </span>
        ))}
      </div>
    )}

    <div className="mt-3 flex items-center gap-2 border-t border-line pt-2.5">
      <label className="sr-only" htmlFor={`stage-${lead.id}`}>
        Move {lead.name} to a different stage
      </label>
      <select
        id={`stage-${lead.id}`}
        value={lead.stage}
        onChange={(event) => onMove(lead, event.target.value)}
        className="h-7 flex-1 rounded-control border border-line bg-surface-sunk px-1.5 text-label text-ink-secondary transition-colors duration-150 hover:border-line-strong focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
      >
        {STAGES.map((stage) => (
          <option key={stage.key} value={stage.key}>
            {stage.label}
          </option>
        ))}
      </select>
      {lead.apply_url && (
        <a
          href={lead.apply_url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open the posting for ${lead.role || lead.company}`}
          className="rounded-control border border-line-strong px-2 py-1 text-ink-secondary transition-colors duration-150 hover:bg-surface-sunk hover:text-ink"
        >
          <ExternalLink size={13} />
        </a>
      )}
      <Link
        to={`/dashboard/outreach/compose?lead=${lead.id}`}
        className="rounded-control border border-line-strong px-2 py-1 text-label font-medium text-ink transition-colors duration-150 hover:bg-surface-sunk"
      >
        Draft
      </Link>
    </div>
  </article>
);

/* ------------------------------------------------------------------- table */

const LeadTable = ({ leads }) => (
  <Panel className="overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-line bg-surface-sunk">
            {['Name', 'Company', 'Stage', 'Source', 'Score', 'Last contact', 'Added'].map(
              (heading) => (
                <th
                  key={heading}
                  scope="col"
                  className={cx(
                    'px-4 py-2.5 text-micro font-semibold uppercase text-ink-tertiary',
                    ['Score'].includes(heading) && 'text-right'
                  )}
                >
                  {heading}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {leads.map((lead) => {
            const stage = stageMeta(lead.stage);
            return (
              <tr
                key={lead.id}
                className="transition-colors duration-150 hover:bg-surface-sunk"
              >
                <td className="px-4 py-3">
                  <Link
                    to={`/dashboard/leads/${lead.id}`}
                    className="text-body font-semibold text-ink underline-offset-4 hover:underline"
                  >
                    {lead.name}
                  </Link>
                  <p className="text-label text-ink-tertiary">{lead.email}</p>
                </td>
                <td className="px-4 py-3 text-body text-ink-secondary">
                  {lead.company || '—'}
                  {lead.role && (
                    <p className="text-label text-ink-tertiary">{lead.role}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={stage.tone}>{stage.label}</Badge>
                </td>
                <td className="px-4 py-3 text-label text-ink-secondary">
                  {lead.source_display}
                </td>
                <td className="tabular px-4 py-3 text-right text-body text-ink">
                  {lead.score}
                </td>
                <td className="px-4 py-3 text-label text-ink-secondary">
                  {lead.last_contacted_at ? relativeTime(lead.last_contacted_at) : '—'}
                </td>
                <td className="px-4 py-3 text-label text-ink-tertiary">
                  {formatDate(lead.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </Panel>
);

/* ------------------------------------------------------------------ create */

const CreateLead = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(BLANK);
      setError(null);
    }
  }, [open]);

  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/crm/leads/', { ...form, score: Number(form.score) || 50 });
      onCreated();
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a lead"
      description="Only a name and an email are required — the rest sharpens your templates later."
      width="max-w-xl"
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="lead-name">
            <Input id="lead-name" required autoFocus value={form.name} onChange={update('name')} />
          </Field>
          <Field label="Email" htmlFor="lead-email">
            <Input
              id="lead-email"
              type="email"
              required
              value={form.email}
              onChange={update('email')}
            />
          </Field>
          <Field label="Company" htmlFor="lead-company">
            <Input id="lead-company" value={form.company} onChange={update('company')} />
          </Field>
          <Field label="Role" htmlFor="lead-role" hint="Used by {{role}} in templates">
            <Input id="lead-role" value={form.role} onChange={update('role')} />
          </Field>
          <Field label="Stage" htmlFor="lead-stage">
            <Select id="lead-stage" value={form.stage} onChange={update('stage')}>
              {STAGES.map((stage) => (
                <option key={stage.key} value={stage.key}>
                  {stage.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Source" htmlFor="lead-source">
            <Select id="lead-source" value={form.source} onChange={update('source')}>
              {SOURCES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="LinkedIn" htmlFor="lead-linkedin">
            <Input
              id="lead-linkedin"
              type="url"
              placeholder="https://linkedin.com/in/…"
              value={form.linkedin_url}
              onChange={update('linkedin_url')}
            />
          </Field>
          <Field label="Tags" htmlFor="lead-tags" hint="Comma separated">
            <Input id="lead-tags" value={form.tags} onChange={update('tags')} />
          </Field>
        </div>

        <Field label="Notes" htmlFor="lead-notes">
          <Textarea id="lead-notes" rows={3} value={form.notes} onChange={update('notes')} />
        </Field>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={!form.name || !form.email}>
            Add lead
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default Leads;
