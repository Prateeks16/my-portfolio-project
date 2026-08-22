import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Linkedin,
  Mail,
  MapPin,
  Send,
  Trash2,
} from 'lucide-react';
import api from '../../api';
import { apiError, useApi } from '../../lib/useApi';
import { STAGES, SOURCES, cx, formatDateTime, initials, relativeTime } from '../../lib/format';
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
  PanelHeader,
  Select,
  Textarea,
} from '../components/ui';

const KIND_TONE = {
  email_sent: 'success',
  email_draft: 'warning',
  stage_change: 'info',
  created: 'neutral',
  note: 'neutral',
  call: 'info',
  meeting: 'info',
};

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: lead, loading, error, refetch, setData } = useApi(`/crm/leads/${id}/`);

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [note, setNote] = useState('');
  const [notingBusy, setNotingBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    if (lead) {
      setForm({
        name: lead.name || '',
        email: lead.email || '',
        company: lead.company || '',
        role: lead.role || '',
        linkedin_url: lead.linkedin_url || '',
        location: lead.location || '',
        stage: lead.stage,
        source: lead.source,
        score: lead.score,
        tags: lead.tags || '',
        notes: lead.notes || '',
        next_follow_up_at: lead.next_follow_up_at
          ? lead.next_follow_up_at.slice(0, 10)
          : '',
      });
    }
  }, [lead]);

  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = async (event) => {
    event?.preventDefault();
    setSaving(true);
    setSaveError(null);
    const stageChanged = form.stage !== lead.stage;
    try {
      const payload = {
        ...form,
        score: Number(form.score) || 0,
        next_follow_up_at: form.next_follow_up_at
          ? new Date(`${form.next_follow_up_at}T09:00:00`).toISOString()
          : null,
      };
      const { data } = await api.patch(`/crm/leads/${id}/`, payload);
      setData({ ...lead, ...data });
      if (stageChanged) {
        setSettling(true);
        setTimeout(() => setSettling(false), 440);
      }
      refetch();
    } catch (caught) {
      setSaveError(apiError(caught));
    } finally {
      setSaving(false);
    }
  };

  const addNote = async (event) => {
    event.preventDefault();
    if (!note.trim()) return;
    setNotingBusy(true);
    try {
      await api.post(`/crm/leads/${id}/note/`, { body: note.trim() });
      setNote('');
      refetch();
    } catch (caught) {
      setSaveError(apiError(caught));
    } finally {
      setNotingBusy(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/crm/leads/${id}/`);
      navigate('/dashboard/leads', { replace: true });
    } catch (caught) {
      setSaveError(apiError(caught));
      setConfirmDelete(false);
    }
  };

  if (loading || !form) {
    return (
      <Panel>
        <LoadingPanel rows={6} label="Loading lead" />
      </Panel>
    );
  }

  if (error) {
    return <ErrorNote onRetry={refetch}>{error}</ErrorNote>;
  }

  return (
    <>
      <Link
        to="/dashboard/leads"
        className="mb-4 inline-flex items-center gap-2 text-label font-medium text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
      >
        <ArrowLeft size={14} /> All leads
      </Link>

      <header
        className={cx(
          'mb-6 flex flex-wrap items-start gap-4 rounded-panel border border-line bg-surface p-5 shadow-row',
          settling && 'animate-stageSettle'
        )}
      >
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-sunk text-body font-bold text-ink-secondary ring-1 ring-line"
        >
          {initials(lead.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-page font-semibold text-ink">{lead.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-label text-ink-secondary">
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-ink hover:underline"
            >
              <Mail size={13} /> {lead.email}
            </a>
            {lead.company && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 size={13} /> {lead.company}
                {lead.role && ` · ${lead.role}`}
              </span>
            )}
            {lead.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} /> {lead.location}
              </span>
            )}
            {lead.linkedin_url && (
              <a
                href={lead.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-ink hover:underline"
              >
                <Linkedin size={13} /> LinkedIn
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/dashboard/outreach/compose?lead=${lead.id}`}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-body font-semibold text-on-accent transition-all duration-500 ease-fluid hover:bg-white active:scale-[0.98]"
          >
            <Send size={14} /> Draft email
          </Link>
          <Button variant="danger" onClick={() => setConfirmDelete(true)} aria-label="Delete lead">
            <Trash2 size={15} />
          </Button>
        </div>
      </header>

      {saveError && (
        <div className="mb-4">
          <ErrorNote>{saveError}</ErrorNote>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        {/* ---------------------------------------------------------- timeline */}
        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Add a note" meta="Recorded on the timeline below" />
            <form onSubmit={addNote} className="space-y-3 p-4">
              <Textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="What happened? A call, a reply, something you learned…"
                aria-label="Note"
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" loading={notingBusy} disabled={!note.trim()}>
                  Save note
                </Button>
              </div>
            </form>
          </Panel>

          <Panel>
            <PanelHeader
              title="Timeline"
              meta={`${lead.activities?.length || 0} entries, newest first`}
            />
            {lead.activities?.length ? (
              <ol className="divide-y divide-line">
                {lead.activities.map((activity) => (
                  <li key={activity.id} className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={KIND_TONE[activity.kind] || 'neutral'}>
                        {activity.kind_display}
                      </Badge>
                      <span className="text-label text-ink-tertiary">
                        {relativeTime(activity.created_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-body font-medium text-ink">
                      {activity.summary}
                    </p>
                    {activity.body && (
                      <p className="prose-measure mt-1 whitespace-pre-line text-label leading-relaxed text-ink-secondary">
                        {activity.body.length > 400
                          ? `${activity.body.slice(0, 400)}…`
                          : activity.body}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="Nothing recorded yet"
                message="Notes, drafts and stage changes all appear here as they happen."
              />
            )}
          </Panel>
        </div>

        {/* ----------------------------------------------------------- details */}
        <form onSubmit={save} className="space-y-5">
          <Panel>
            <PanelHeader title="Details" />
            <div className="space-y-3.5 p-4">
              <Field label="Stage" htmlFor="d-stage">
                <Select id="d-stage" value={form.stage} onChange={update('stage')}>
                  {STAGES.map((stage) => (
                    <option key={stage.key} value={stage.key}>
                      {stage.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Source" htmlFor="d-source">
                <Select id="d-source" value={form.source} onChange={update('source')}>
                  {SOURCES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Follow up on"
                htmlFor="d-followup"
                hint="Shows in the Overview work queue when due"
              >
                <Input
                  id="d-followup"
                  type="date"
                  value={form.next_follow_up_at}
                  onChange={update('next_follow_up_at')}
                />
              </Field>
              <Field label="Score" htmlFor="d-score" hint="0–100 priority">
                <Input
                  id="d-score"
                  type="number"
                  min="0"
                  max="100"
                  value={form.score}
                  onChange={update('score')}
                />
              </Field>
              <Field label="Tags" htmlFor="d-tags" hint="Comma separated">
                <Input id="d-tags" value={form.tags} onChange={update('tags')} />
              </Field>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Contact" />
            <div className="space-y-3.5 p-4">
              <Field label="Name" htmlFor="d-name">
                <Input id="d-name" value={form.name} onChange={update('name')} />
              </Field>
              <Field label="Email" htmlFor="d-email">
                <Input id="d-email" type="email" value={form.email} onChange={update('email')} />
              </Field>
              <Field label="Company" htmlFor="d-company">
                <Input id="d-company" value={form.company} onChange={update('company')} />
              </Field>
              <Field label="Role" htmlFor="d-role">
                <Input id="d-role" value={form.role} onChange={update('role')} />
              </Field>
              <Field label="Location" htmlFor="d-location">
                <Input id="d-location" value={form.location} onChange={update('location')} />
              </Field>
              <Field label="LinkedIn" htmlFor="d-linkedin">
                <Input
                  id="d-linkedin"
                  type="url"
                  value={form.linkedin_url}
                  onChange={update('linkedin_url')}
                />
              </Field>
              <Field label="Notes" htmlFor="d-notes">
                <Textarea id="d-notes" rows={4} value={form.notes} onChange={update('notes')} />
              </Field>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
              <span className="inline-flex items-center gap-1.5 text-label text-ink-tertiary">
                <CalendarClock size={13} />
                {lead.last_contacted_at
                  ? `Contacted ${relativeTime(lead.last_contacted_at)}`
                  : 'Not contacted yet'}
              </span>
              <Button type="submit" size="sm" loading={saving}>
                Save changes
              </Button>
            </div>
          </Panel>

          <p className="px-1 text-label text-ink-tertiary">
            Added {formatDateTime(lead.created_at)}
          </p>
        </form>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${lead.name}?`}
        description="The lead and its whole timeline are removed. This cannot be undone."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Keep lead
          </Button>
          <Button variant="danger" onClick={remove}>
            <Trash2 size={15} /> Delete permanently
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default LeadDetail;
