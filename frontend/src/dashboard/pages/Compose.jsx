import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Paperclip,
  Save,
  Send,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import api from '../../api';
import { apiError, useApi } from '../../lib/useApi';
import { formatBytes, relativeTime } from '../../lib/format';
import {
  Badge,
  Button,
  ErrorNote,
  Field,
  Input,
  Modal,
  Note,
  Panel,
  PanelHeader,
  Select,
  Textarea,
} from '../components/ui';

const Compose = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const leadId = params.get('lead');
  const emailId = params.get('email');
  const toParam = params.get('to');
  const templateParam = params.get('template');

  const leads = useApi('/crm/leads/');
  const templates = useApi('/crm/templates/');
  const mail = useApi('/crm/emails/mail_status/');
  const existing = useApi(emailId ? `/crm/emails/${emailId}/` : null, { skip: !emailId });

  const [form, setForm] = useState({
    lead: leadId || '',
    template: templateParam || '',
    to_email: toParam || '',
    to_name: '',
    subject: '',
    body: '',
    // On by default: the templates say "attached" in the body, so not sending
    // it is the exception that needs a deliberate click.
    attach_resume: true,
  });
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('draft');
  const [sentAt, setSentAt] = useState(null);
  const [savedId, setSavedId] = useState(emailId || null);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);
  const [busy, setBusy] = useState(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [preview, setPreview] = useState(false);

  const leadList = useMemo(
    () => (Array.isArray(leads.data) ? leads.data : []),
    [leads.data]
  );
  const templateList = Array.isArray(templates.data) ? templates.data : [];
  const selectedLead = useMemo(
    () => leadList.find((lead) => String(lead.id) === String(form.lead)),
    [leadList, form.lead]
  );

  // Loading an existing email takes precedence over any lead prefill.
  useEffect(() => {
    if (existing.data) {
      setForm({
        lead: existing.data.lead || '',
        template: existing.data.template || '',
        to_email: existing.data.to_email || '',
        to_name: existing.data.to_name || '',
        subject: existing.data.subject || '',
        body: existing.data.body || '',
        attach_resume: existing.data.attach_resume !== false,
      });
      setAttachments(existing.data.attachments || []);
      setStatus(existing.data.status);
      setSentAt(existing.data.sent_at);
      setSavedId(existing.data.id);
    }
  }, [existing.data]);

  // Prefill the recipient when arriving from a lead.
  useEffect(() => {
    if (!emailId && selectedLead && !form.to_email) {
      setForm((current) => ({
        ...current,
        to_email: selectedLead.email,
        to_name: selectedLead.name,
      }));
    }
  }, [selectedLead, emailId, form.to_email]);

  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const locked = status === 'sent';

  // Arriving from "Compose with this" on the Templates page.
  useEffect(() => {
    if (templateParam && !emailId && !form.subject && templateList.length > 0) {
      applyTemplate(templateParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateParam, emailId, templateList.length]);

  const applyTemplate = async (templateId) => {
    setForm((current) => ({ ...current, template: templateId }));
    if (!templateId) return;
    setBusy('template');
    setError(null);
    try {
      const { data } = await api.post(`/crm/templates/${templateId}/preview/`, {
        lead: form.lead || undefined,
        name: form.to_name || undefined,
      });
      setForm((current) => ({ ...current, subject: data.subject, body: data.body }));
      setFlash('Template applied. Edit anything before you save.');
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(null);
    }
  };

  const changeLead = async (value) => {
    const lead = leadList.find((row) => String(row.id) === String(value));
    setForm((current) => ({
      ...current,
      lead: value,
      to_email: lead ? lead.email : current.to_email,
      to_name: lead ? lead.name : current.to_name,
    }));
    // Re-render the current template against the newly chosen person.
    if (form.template && lead) {
      try {
        const { data } = await api.post(`/crm/templates/${form.template}/preview/`, {
          lead: value,
        });
        setForm((current) => ({
          ...current,
          lead: value,
          to_email: lead.email,
          to_name: lead.name,
          subject: data.subject,
          body: data.body,
        }));
      } catch {
        /* keep whatever is already in the editor */
      }
    }
  };

  /**
   * Saves and returns the draft's id, rather than a bare success flag.
   *
   * `setSavedId` does not update the binding a caller already closed over, so a
   * send that saved first and then read `savedId` was reading null on a draft
   * that had never been saved before — and posting to /emails/null/send/.
   * Handing the id back keeps the caller off the state entirely.
   */
  const saveDraft = async () => {
    setBusy('save');
    setError(null);
    setFlash(null);
    const payload = {
      lead: form.lead || null,
      template: form.template || null,
      to_email: form.to_email,
      to_name: form.to_name,
      subject: form.subject,
      body: form.body,
      attach_resume: form.attach_resume,
      status: 'draft',
    };
    try {
      let id = savedId;
      if (id) {
        await api.patch(`/crm/emails/${id}/`, payload);
      } else {
        const { data } = await api.post('/crm/emails/', payload);
        id = data.id;
        setSavedId(id);
        navigate(`/dashboard/outreach/compose?email=${id}`, { replace: true });
      }
      setFlash('Draft saved.');
      return id;
    } catch (caught) {
      setError(apiError(caught));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const send = async () => {
    setConfirmSend(false);
    const id = await saveDraft();
    if (!id) return;
    setBusy('send');
    setError(null);
    try {
      const { data } = await api.post(`/crm/emails/${id}/send/`);
      setStatus(data.status);
      setSentAt(data.sent_at);
      setFlash(`Sent to ${data.to_email}.`);
    } catch (caught) {
      const code = caught?.response?.data?.code;
      // Both of these already carry a message that says what to do about it;
      // prefixing "Could not send" would only bury it.
      setError(
        code === 'mail_not_configured' || code === 'attachment_unavailable'
          ? caught.response.data.detail
          : `Could not send: ${apiError(caught)}`
      );
    } finally {
      setBusy(null);
    }
  };

  /**
   * Files hang off a saved draft, so an unsaved compose is saved first.
   *
   * Uploaded one at a time rather than in one request: the server checks the
   * running total against the send ceiling, so the third file can be refused
   * while the first two are already safely attached.
   */
  const addFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    // Cleared immediately so picking the same file twice still fires onChange.
    event.target.value = '';
    if (!files.length) return;

    const id = await saveDraft();
    if (!id) return;

    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const body = new FormData();
        body.append('file', file);
        const { data } = await api.post(`/crm/emails/${id}/attach/`, body);
        setAttachments((current) => [...current, data]);
      }
      setFlash(files.length > 1 ? `${files.length} files attached.` : 'File attached.');
    } catch (caught) {
      setError(caught?.response?.data?.detail || apiError(caught));
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (attachmentId) => {
    setError(null);
    try {
      await api.delete(`/crm/emails/${savedId}/attachments/${attachmentId}/`);
      setAttachments((current) => current.filter((row) => row.id !== attachmentId));
    } catch (caught) {
      setError(apiError(caught));
    }
  };

  const discard = async () => {
    if (!savedId) {
      navigate('/dashboard/outreach');
      return;
    }
    try {
      await api.delete(`/crm/emails/${savedId}/`);
      navigate('/dashboard/outreach', { replace: true });
    } catch (caught) {
      setError(apiError(caught));
    }
  };

  const canSend = form.to_email && form.subject && form.body && !locked;

  return (
    <>
      <Link
        to="/dashboard/outreach"
        className="mb-4 inline-flex items-center gap-2 text-label font-medium text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
      >
        <ArrowLeft size={14} /> All outreach
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-page font-semibold text-ink">
            {locked ? 'Sent email' : savedId ? 'Edit draft' : 'Compose'}
          </h1>
          <p className="mt-1.5 text-body text-ink-secondary">
            {locked
              ? `Sent ${relativeTime(sentAt)} — kept as a record.`
              : 'Pick a template, choose who it is going to, and it fills in their details.'}
          </p>
        </div>
        {locked && <Badge tone="success">Sent</Badge>}
      </div>

      {mail.data?.configured === false && !locked && (
        <div className="mb-5">
          <Note tone="warning">
            Sending is off — no sending credentials are set on the backend, so
            <strong className="font-semibold"> Send </strong>
            will refuse and save the draft instead.{' '}
            <Link to="/dashboard/settings" className="font-semibold underline">
              How to enable it
            </Link>
          </Note>
        </div>
      )}

      {error && (
        <div className="mb-5">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {flash && !error && (
        <div className="mb-5">
          <Note tone="success">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={15} /> {flash}
            </span>
          </Note>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
        <Panel>
          <PanelHeader
            title="Message"
            meta={locked ? 'Read only' : 'Everything here is editable'}
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPreview(true)}
                disabled={!form.body}
              >
                <Eye size={14} /> Preview
              </Button>
            }
          />
          <div className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="To (email)" htmlFor="c-email">
                <Input
                  id="c-email"
                  type="email"
                  required
                  disabled={locked}
                  value={form.to_email}
                  onChange={update('to_email')}
                />
              </Field>
              <Field label="To (name)" htmlFor="c-name">
                <Input
                  id="c-name"
                  disabled={locked}
                  value={form.to_name}
                  onChange={update('to_name')}
                />
              </Field>
            </div>

            <Field label="Subject" htmlFor="c-subject">
              <Input
                id="c-subject"
                required
                disabled={locked}
                value={form.subject}
                onChange={update('subject')}
              />
            </Field>

            <Field
              label="Body"
              htmlFor="c-body"
              hint={locked ? undefined : 'Plain text. Line breaks are preserved in the sent email.'}
            >
              <Textarea
                id="c-body"
                rows={18}
                disabled={locked}
                value={form.body}
                onChange={update('body')}
                className="font-[inherit] text-body"
              />
            </Field>
          </div>

          <div className="border-t border-line px-4 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-label font-semibold text-ink">Attachments</h3>
              {!locked && (
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-control border border-line px-3 py-1.5 text-label font-medium text-ink-secondary transition-colors hover:border-line-strong hover:text-ink">
                  <Paperclip size={14} />
                  {uploading ? 'Uploading…' : 'Add files'}
                  <input
                    type="file"
                    multiple
                    className="sr-only"
                    disabled={uploading}
                    onChange={addFiles}
                  />
                </label>
              )}
            </div>

            {/*
              The resume is not an uploaded file -- it is picked automatically
              from the lead's role. Shown alongside the others because from the
              recipient's side there is no difference, and a row that says what
              will be sent is the point.
            */}
            <label className="mt-3 flex items-start gap-2.5 rounded-control border border-line px-3.5 py-2.5">
              <input
                type="checkbox"
                disabled={locked}
                checked={form.attach_resume}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    attach_resume: event.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
              />
              <span className="text-body text-ink-secondary">
                Attach my résumé —{' '}
                <strong className="font-semibold text-ink">
                  {selectedLead?.resume_for_role === 'ai_ml'
                    ? 'AI / ML variant'
                    : 'Backend / SDE variant'}
                </strong>
                {selectedLead ? (
                  <span className="text-ink-tertiary">
                    {' '}
                    · chosen from {selectedLead.role || 'the role'}
                  </span>
                ) : (
                  <span className="text-ink-tertiary"> · default without a lead</span>
                )}
              </span>
            </label>

            {attachments.length > 0 && (
              <ul className="mt-2 divide-y divide-line rounded-control border border-line">
                {attachments.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-body text-ink">
                      {file.filename}
                    </span>
                    <span className="shrink-0 text-label text-ink-tertiary">
                      {formatBytes(file.size)}
                    </span>
                    {!locked && (
                      <button
                        type="button"
                        onClick={() => removeAttachment(file.id)}
                        aria-label={`Remove ${file.filename}`}
                        className="shrink-0 rounded p-1 text-ink-tertiary transition-colors hover:text-danger"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {attachments.length > 0 && (
              <p className="mt-2 text-label text-ink-tertiary">
                {formatBytes(attachments.reduce((total, file) => total + file.size, 0))}{' '}
                attached. Gmail accepts about 3.7 MB per message through the API.
              </p>
            )}
          </div>

          {!locked && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
              <Button variant="danger" size="sm" onClick={discard}>
                <Trash2 size={14} /> Discard
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={saveDraft}
                  loading={busy === 'save'}
                  disabled={!form.to_email}
                >
                  <Save size={14} /> Save draft
                </Button>
                <Button
                  onClick={() => setConfirmSend(true)}
                  loading={busy === 'send'}
                  disabled={!canSend}
                >
                  <Send size={14} /> Send
                </Button>
              </div>
            </div>
          )}
        </Panel>

        {/* ------------------------------------------------------------ setup */}
        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Personalise" />
            <div className="space-y-3.5 p-4">
              <Field
                label="Lead"
                htmlFor="c-lead"
                hint="Fills {{name}}, {{company}} and {{role}}"
              >
                <Select
                  id="c-lead"
                  disabled={locked}
                  value={form.lead || ''}
                  onChange={(event) => changeLead(event.target.value)}
                >
                  <option value="">No lead — one-off email</option>
                  {leadList.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name}
                      {lead.company ? ` · ${lead.company}` : ''}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Template" htmlFor="c-template">
                <Select
                  id="c-template"
                  disabled={locked || busy === 'template'}
                  value={form.template || ''}
                  onChange={(event) => applyTemplate(event.target.value)}
                >
                  <option value="">Start from blank</option>
                  {templateList.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {form.template && !locked && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  loading={busy === 'template'}
                  onClick={() => applyTemplate(form.template)}
                >
                  <Wand2 size={14} /> Re-apply template
                </Button>
              )}
            </div>
          </Panel>

          {selectedLead && (
            <Panel>
              <PanelHeader title="About this lead" />
              <dl className="divide-y divide-line text-body">
                {[
                  ['Company', selectedLead.company],
                  ['Role', selectedLead.role],
                  ['Stage', selectedLead.stage_display],
                  ['Source', selectedLead.source_display],
                  [
                    'Resume to attach',
                    selectedLead.resume_for_role === 'ai_ml'
                      ? 'AI / ML variant'
                      : 'Backend / SDE variant',
                  ],
                  [
                    'Last contacted',
                    selectedLead.last_contacted_at
                      ? relativeTime(selectedLead.last_contacted_at)
                      : 'Never',
                  ],
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3 px-4 py-2.5">
                      <dt className="text-label text-ink-tertiary">{label}</dt>
                      <dd className="text-label font-medium text-ink">{value}</dd>
                    </div>
                  ))}
              </dl>
              <div className="border-t border-line px-4 py-3">
                <Link
                  to={`/dashboard/leads/${selectedLead.id}`}
                  className="text-label font-semibold text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
                >
                  Open full record
                </Link>
              </div>
            </Panel>
          )}
        </div>
      </div>

      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title="Preview"
        description={`As it will arrive for ${form.to_name || form.to_email || 'the recipient'}`}
        width="max-w-2xl"
      >
        <div className="rounded-control border border-line bg-surface-sunk p-5">
          <p className="text-label text-ink-tertiary">Subject</p>
          <p className="mb-4 text-body font-semibold text-ink">{form.subject || '(no subject)'}</p>
          <div className="border-t border-line pt-4">
            <p className="whitespace-pre-line text-body leading-relaxed text-ink">
              {form.body}
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmSend}
        onClose={() => setConfirmSend(false)}
        title="Send this email?"
        description={`It will go to ${form.to_email} immediately. Sent emails cannot be edited or unsent.`}
      >
        <div className="mb-4 rounded-control border border-line bg-surface-sunk px-3.5 py-3">
          <p className="text-label text-ink-tertiary">Subject</p>
          <p className="text-body font-semibold text-ink">{form.subject}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmSend(false)}>
            Keep editing
          </Button>
          <Button onClick={send}>
            <Send size={14} /> Send now
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default Compose;
