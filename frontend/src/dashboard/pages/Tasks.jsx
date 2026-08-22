import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import api from '../../api';
import { apiError, useApi } from '../../lib/useApi';
import { cx, formatDate } from '../../lib/format';
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

const PRIORITY = {
  high: { tone: 'danger', label: 'High' },
  medium: { tone: 'warning', label: 'Medium' },
  low: { tone: 'neutral', label: 'Low' },
};

const BLANK = { title: '', description: '', due_date: '', priority: 'medium', lead: '' };

const Tasks = () => {
  const { data, loading, error, refetch, setData } = useApi('/crm/tasks/');
  const leads = useApi('/crm/leads/');
  const [creating, setCreating] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [leaving, setLeaving] = useState(null); // task id animating out

  const tasks = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const { open, done } = useMemo(
    () => ({
      open: tasks.filter((task) => !task.is_done),
      done: tasks.filter((task) => task.is_done),
    }),
    [tasks]
  );

  const toggle = async (task) => {
    const next = !task.is_done;
    // Hold the row for one short beat so it leaves rather than vanishing.
    setLeaving(task.id);
    setTimeout(() => setLeaving(null), 160);
    setData(tasks.map((row) => (row.id === task.id ? { ...row, is_done: next } : row)));
    try {
      await api.patch(`/crm/tasks/${task.id}/`, { is_done: next });
    } catch (caught) {
      setData(tasks);
      window.alert(apiError(caught));
    }
  };

  const remove = async (task) => {
    setData(tasks.filter((row) => row.id !== task.id));
    try {
      await api.delete(`/crm/tasks/${task.id}/`);
    } catch (caught) {
      refetch();
      window.alert(apiError(caught));
    }
  };

  const visible = useMemo(() => {
    const base = showDone ? done : open;
    if (leaving === null) return base;
    const held = tasks.find((row) => row.id === leaving);
    // Appended, not spliced back into position: it is on its way out, and the
    // surviving rows should already have closed ranks behind it.
    return held && !base.some((row) => row.id === leaving) ? [...base, held] : base;
  }, [showDone, done, open, leaving, tasks]);

  return (
    <>
      <PageHeading
        title="Tasks"
        description="Things to do that are not an email — prepare for a call, update a project, chase a referral."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus size={15} /> New task
          </Button>
        }
      />

      <div role="tablist" className="mb-4 flex gap-1.5">
        {[
          [false, `Open (${open.length})`],
          [true, `Done (${done.length})`],
        ].map(([value, label]) => (
          <button
            key={String(value)}
            role="tab"
            aria-selected={showDone === value}
            onClick={() => setShowDone(value)}
            className={cx(
              'h-8 rounded-control px-3 text-label font-medium transition-colors duration-150',
              showDone === value
                ? 'bg-ink text-on-accent'
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
          <LoadingPanel rows={5} label="Loading tasks" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title={showDone ? 'Nothing completed yet' : 'No open tasks'}
            message={
              showDone
                ? 'Completed tasks are kept here as a record.'
                : 'Add anything you need to remember that is not itself an email.'
            }
            action={
              !showDone && (
                <Button onClick={() => setCreating(true)}>
                  <Plus size={15} /> New task
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((task) => {
              const overdue =
                !task.is_done &&
                task.due_date &&
                new Date(task.due_date) < new Date(new Date().toDateString());
              const priority = PRIORITY[task.priority] || PRIORITY.medium;
              return (
                <li
                  key={task.id}
                  className={cx(
                    'flex items-start gap-3 px-4 py-3.5 transition-all duration-[160ms] ease-out',
                    leaving === task.id ? 'translate-x-1.5 opacity-0' : 'translate-x-0 opacity-100'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={task.is_done}
                    onChange={() => toggle(task)}
                    aria-label={`Mark "${task.title}" ${task.is_done ? 'not done' : 'done'}`}
                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong text-ink accent-ink focus-visible:outline-2 focus-visible:outline-ink"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cx(
                        'text-body font-medium',
                        task.is_done ? 'text-ink-tertiary line-through' : 'text-ink'
                      )}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="mt-0.5 text-label leading-relaxed text-ink-secondary">
                        {task.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-ink-tertiary">
                      {task.due_date && (
                        <span className={overdue ? 'font-semibold text-danger' : undefined}>
                          {overdue ? 'Overdue — ' : 'Due '}
                          {formatDate(task.due_date)}
                        </span>
                      )}
                      {task.lead && (
                        <Link
                          to={`/dashboard/leads/${task.lead}`}
                          className="underline-offset-4 hover:text-ink hover:underline"
                        >
                          {task.lead_name}
                        </Link>
                      )}
                    </div>
                  </div>
                  <Badge tone={priority.tone}>{priority.label}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete "${task.title}"`}
                    onClick={() => remove(task)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <CreateTask
        open={creating}
        leads={Array.isArray(leads.data) ? leads.data : []}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          refetch();
        }}
      />
    </>
  );
};

const CreateTask = ({ open, leads, onClose, onCreated }) => {
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/crm/tasks/', {
        ...form,
        due_date: form.due_date || null,
        lead: form.lead || null,
      });
      setForm(BLANK);
      onCreated();
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New task">
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        <Field label="Title" htmlFor="task-title">
          <Input id="task-title" required autoFocus value={form.title} onChange={update('title')} />
        </Field>
        <Field label="Description" htmlFor="task-desc">
          <Textarea id="task-desc" rows={3} value={form.description} onChange={update('description')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Due date" htmlFor="task-due">
            <Input id="task-due" type="date" value={form.due_date} onChange={update('due_date')} />
          </Field>
          <Field label="Priority" htmlFor="task-priority">
            <Select id="task-priority" value={form.priority} onChange={update('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </Field>
        </div>
        <Field label="Linked lead" htmlFor="task-lead">
          <Select id="task-lead" value={form.lead} onChange={update('lead')}>
            <option value="">None</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.name}
                {lead.company ? ` · ${lead.company}` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={!form.title}>
            Add task
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default Tasks;
