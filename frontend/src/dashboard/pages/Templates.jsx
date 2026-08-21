import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../api';
import { apiError, useApi } from '../../lib/useApi';
import {
  Button,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  LoadingPanel,
  Modal,
  Note,
  Panel,
  PageHeading,
  Textarea,
} from '../components/ui';

const PLACEHOLDERS = [
  ['{{first_name}}', "the lead's first name"],
  ['{{name}}', 'their full name'],
  ['{{company}}', 'their company'],
  ['{{role}}', 'the role you are discussing'],
  ['{{my_name}}', 'your name'],
  ['{{my_portfolio}}', 'your portfolio URL'],
  ['{{my_github}}', 'your GitHub URL'],
  ['{{my_linkedin}}', 'your LinkedIn URL'],
];

const BLANK = { name: '', category: '', description: '', subject: '', body: '' };

const Templates = () => {
  const { data, loading, error, refetch } = useApi('/crm/templates/');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const templates = Array.isArray(data) ? data : [];

  const remove = async () => {
    try {
      await api.delete(`/crm/templates/${deleting.id}/`);
      setDeleting(null);
      refetch();
    } catch (caught) {
      window.alert(apiError(caught));
    }
  };

  return (
    <>
      <PageHeading
        title="Templates"
        description="Reusable emails. Placeholders are filled from the lead you pick when composing."
        action={
          <Button onClick={() => setEditing(BLANK)}>
            <Plus size={15} /> New template
          </Button>
        }
      />

      <div className="mb-5">
        <Note tone="info">
          <span className="font-semibold">Placeholders:</span>{' '}
          {PLACEHOLDERS.map(([token], index) => (
            <React.Fragment key={token}>
              {index > 0 && ', '}
              <code className="rounded bg-info/10 px-1 py-0.5 text-label">{token}</code>
            </React.Fragment>
          ))}
        </Note>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorNote onRetry={refetch}>{error}</ErrorNote>
        </div>
      )}

      {loading ? (
        <Panel>
          <LoadingPanel rows={5} label="Loading templates" />
        </Panel>
      ) : templates.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Mail}
            title="No templates yet"
            message="A template saves you rewriting the same introduction. Write it once with placeholders, then personalise per lead."
            action={
              <Button onClick={() => setEditing(BLANK)}>
                <Plus size={15} /> New template
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Panel key={template.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
                <div className="min-w-0">
                  <h2 className="truncate text-panel font-semibold text-ink">
                    {template.name}
                  </h2>
                  <p className="mt-0.5 text-label text-ink-tertiary">
                    {template.category || 'Uncategorised'}
                    {template.times_used > 0 && ` · used ${template.times_used}×`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit ${template.name}`}
                    onClick={() => setEditing(template)}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${template.name}`}
                    onClick={() => setDeleting(template)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <div className="flex-1 px-4 py-3">
                <p className="text-body font-medium text-ink">{template.subject}</p>
                <p className="mt-2 line-clamp-4 whitespace-pre-line text-label leading-relaxed text-ink-secondary">
                  {template.body}
                </p>
              </div>
              <div className="border-t border-line px-4 py-2.5">
                <Link
                  to={`/dashboard/outreach/compose?template=${template.id}`}
                  className="text-label font-semibold text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
                >
                  Compose with this
                </Link>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <TemplateEditor
        template={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refetch();
        }}
      />

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="Emails already drafted from it are unaffected."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Keep template
          </Button>
          <Button variant="danger" onClick={remove}>
            <Trash2 size={15} /> Delete
          </Button>
        </div>
      </Modal>
    </>
  );
};

const TemplateEditor = ({ template, onClose, onSaved }) => {
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name || '',
        category: template.category || '',
        description: template.description || '',
        subject: template.subject || '',
        body: template.body || '',
      });
      setError(null);
    }
  }, [template]);

  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (template?.id) await api.patch(`/crm/templates/${template.id}/`, form);
      else await api.post('/crm/templates/', form);
      onSaved();
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(template)}
      onClose={onClose}
      title={template?.id ? 'Edit template' : 'New template'}
      width="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="t-name">
            <Input id="t-name" required autoFocus value={form.name} onChange={update('name')} />
          </Field>
          <Field label="Category" htmlFor="t-category" hint="e.g. Recruiting, Follow-up">
            <Input id="t-category" value={form.category} onChange={update('category')} />
          </Field>
        </div>
        <Field label="Subject" htmlFor="t-subject">
          <Input id="t-subject" required value={form.subject} onChange={update('subject')} />
        </Field>
        <Field label="Body" htmlFor="t-body">
          <Textarea id="t-body" rows={14} required value={form.body} onChange={update('body')} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={!form.name || !form.subject}>
            Save template
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default Templates;
