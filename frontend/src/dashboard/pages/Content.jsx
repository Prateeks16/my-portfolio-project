import React, { useEffect, useState } from 'react';
import { Award, Briefcase, ExternalLink, FolderGit2, Pencil, Plus, Trash2, User } from 'lucide-react';
import api, { API_BASE_URL } from '../../api';
import { apiError, useApi } from '../../lib/useApi';
import { cx, formatDate, parseTechStack } from '../../lib/format';
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
  PanelHeader,
  PageHeading,
  Textarea,
} from '../components/ui';

const TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'projects', label: 'Projects', icon: FolderGit2 },
  { key: 'experiences', label: 'Experience', icon: Briefcase },
  { key: 'achievements', label: 'Achievements', icon: Award },
];

/* Field definitions per resource — keeps one editor working for all of them. */
const SCHEMA = {
  projects: {
    endpoint: '/crm/manage/projects/',
    titleKey: 'title',
    blank: {
      title: '',
      short_description: '',
      description: '',
      tech_stack: '',
      github_url: '',
      live_demo_url: '',
    },
    fields: [
      ['title', 'Title', 'text'],
      ['short_description', 'Short description', 'textarea', 'Shown on the project card'],
      ['description', 'Full description', 'textarea', 'Shown when the project is expanded'],
      ['tech_stack', 'Tech stack', 'text', 'Comma separated, or a JSON array'],
      ['github_url', 'GitHub URL', 'url'],
      ['live_demo_url', 'Live demo URL', 'url'],
    ],
  },
  experiences: {
    endpoint: '/crm/manage/experiences/',
    titleKey: 'position',
    blank: {
      company_name: '',
      position: '',
      location: '',
      start_date: '',
      end_date: '',
      description: '',
      technologies_used: '',
    },
    fields: [
      ['position', 'Position', 'text'],
      ['company_name', 'Company', 'text'],
      ['location', 'Location', 'text'],
      ['start_date', 'Start date', 'date'],
      ['end_date', 'End date', 'date', 'Leave empty if this is current'],
      ['description', 'Description', 'textarea'],
      ['technologies_used', 'Technologies', 'text', 'Comma separated'],
    ],
  },
  achievements: {
    endpoint: '/crm/manage/achievements/',
    titleKey: 'title',
    blank: {
      title: '',
      description: '',
      organization: '',
      date: '',
      achievement_type: '',
      certificate_url: '',
    },
    fields: [
      ['title', 'Title', 'text'],
      ['organization', 'Organisation', 'text'],
      ['date', 'Date', 'date'],
      ['achievement_type', 'Type', 'text', 'e.g. Hackathon, Certification'],
      ['description', 'Description', 'textarea'],
      ['certificate_url', 'Certificate URL', 'url'],
    ],
  },
};

const Content = () => {
  const [tab, setTab] = useState('profile');

  return (
    <>
      <PageHeading
        title="Content"
        description="Everything here renders on the public portfolio. Saving publishes immediately."
      />

      <div role="tablist" aria-label="Content type" className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cx(
              'inline-flex h-9 items-center gap-2 rounded-control px-3.5 text-body font-medium transition-colors duration-150',
              tab === key
                ? 'bg-ink text-on-accent'
                : 'border border-line-strong bg-surface text-ink-secondary hover:bg-surface-sunk'
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <Note tone="info">
          Images and the resume PDF are stored on Cloudinary and are not editable here.
          Change those in{' '}
          <a
            href={`${API_BASE_URL}/admin/`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
          >
            Django admin
          </a>
          .
        </Note>
      </div>

      {tab === 'profile' ? <ProfileEditor /> : <ResourceList type={tab} />}
    </>
  );
};

/* ----------------------------------------------------------------- profile */

const PROFILE_FIELDS = [
  ['full_name', 'Full name', 'text'],
  ['tagline', 'Tagline', 'text', 'One line under your name'],
  ['bio', 'Bio', 'textarea', 'The About section'],
  ['email', 'Email', 'email'],
  ['phone', 'Phone', 'text'],
  ['location', 'Location', 'text'],
  ['github_url', 'GitHub URL', 'url'],
  ['linkedin_url', 'LinkedIn URL', 'url'],
];

const ProfileEditor = () => {
  const { data, loading, error, refetch } = useApi('/crm/manage/profile/');
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const profile = Array.isArray(data) ? data[0] : data;

  useEffect(() => {
    if (profile) {
      setForm(
        Object.fromEntries(PROFILE_FIELDS.map(([key]) => [key, profile[key] || '']))
      );
    }
  }, [profile]);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setSaveError(null);
    setFlash(null);
    try {
      await api.patch(`/crm/manage/profile/${profile.id}/`, form);
      setFlash('Saved. The public site shows this on next load.');
      refetch();
    } catch (caught) {
      setSaveError(apiError(caught));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !form) {
    return (
      <Panel>
        <LoadingPanel rows={5} label="Loading profile" />
      </Panel>
    );
  }
  if (error) return <ErrorNote onRetry={refetch}>{error}</ErrorNote>;
  if (!profile) {
    return (
      <Panel>
        <EmptyState
          icon={User}
          title="No profile record"
          message="Create one in Django admin first — the portfolio reads your name, bio and links from it."
        />
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader title="Profile" meta="Your name, bio and contact details" />
      <form onSubmit={save} className="space-y-4 p-4">
        {saveError && <ErrorNote>{saveError}</ErrorNote>}
        {flash && <Note tone="success">{flash}</Note>}
        <div className="grid gap-4 sm:grid-cols-2">
          {PROFILE_FIELDS.map(([key, label, type, hint]) => (
            <Field
              key={key}
              label={label}
              htmlFor={`p-${key}`}
              hint={hint}
              className={type === 'textarea' ? 'sm:col-span-2' : undefined}
            >
              {type === 'textarea' ? (
                <Textarea
                  id={`p-${key}`}
                  rows={5}
                  value={form[key]}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                />
              ) : (
                <Input
                  id={`p-${key}`}
                  type={type}
                  value={form[key]}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                />
              )}
            </Field>
          ))}
        </div>
        <div className="flex justify-end border-t border-line pt-4">
          <Button type="submit" loading={busy}>
            Save profile
          </Button>
        </div>
      </form>
    </Panel>
  );
};

/* ---------------------------------------------------------------- resources */

const ResourceList = ({ type }) => {
  const schema = SCHEMA[type];
  const { data, loading, error, refetch } = useApi(schema.endpoint);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const items = Array.isArray(data) ? data : [];

  const remove = async () => {
    try {
      await api.delete(`${schema.endpoint}${deleting.id}/`);
      setDeleting(null);
      refetch();
    } catch (caught) {
      window.alert(apiError(caught));
    }
  };

  return (
    <>
      <Panel>
        <PanelHeader
          title={TABS.find((t) => t.key === type).label}
          meta={`${items.length} on the public site`}
          action={
            <Button size="sm" onClick={() => setEditing(schema.blank)}>
              <Plus size={14} /> Add
            </Button>
          }
        />

        {error && (
          <div className="p-4">
            <ErrorNote onRetry={refetch}>{error}</ErrorNote>
          </div>
        )}

        {loading ? (
          <LoadingPanel rows={4} label="Loading" />
        ) : items.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            message="Anything you add appears on the public portfolio straight away."
            action={
              <Button onClick={() => setEditing(schema.blank)}>
                <Plus size={15} /> Add the first one
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-ink">
                    {item[schema.titleKey]}
                  </p>
                  <p className="mt-0.5 text-label text-ink-secondary">
                    {type === 'projects' && item.short_description}
                    {type === 'experiences' &&
                      `${item.company_name} · ${formatDate(item.start_date)} – ${
                        item.end_date ? formatDate(item.end_date) : 'present'
                      }`}
                    {type === 'achievements' &&
                      `${item.organization || '—'} · ${formatDate(item.date)}`}
                  </p>
                  {type === 'projects' && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {parseTechStack(item.tech_stack)
                        .slice(0, 6)
                        .map((tech) => (
                          <span
                            key={tech}
                            className="rounded-full bg-surface-sunk px-1.5 py-0.5 text-micro font-medium text-ink-tertiary ring-1 ring-line"
                          >
                            {tech}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  {item.live_demo_url && (
                    <a
                      href={item.live_demo_url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open live demo"
                      className="inline-flex h-8 items-center rounded-control px-2 text-ink-secondary transition-colors duration-150 hover:bg-line/50 hover:text-ink"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => setEditing(item)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Delete" onClick={() => setDeleting(item)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ResourceEditor
        schema={schema}
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refetch();
        }}
      />

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Remove from the public site?"
        description={`"${deleting?.[schema.titleKey]}" will disappear from your portfolio immediately.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Keep it
          </Button>
          <Button variant="danger" onClick={remove}>
            <Trash2 size={15} /> Delete
          </Button>
        </div>
      </Modal>
    </>
  );
};

const ResourceEditor = ({ schema, item, onClose, onSaved }) => {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (item) {
      setForm(
        Object.fromEntries(
          schema.fields.map(([key]) => {
            const value = item[key];
            // Date inputs need YYYY-MM-DD, and the API may send a full timestamp.
            if (typeof value === 'string' && value.includes('T')) {
              return [key, value.slice(0, 10)];
            }
            return [key, value ?? ''];
          })
        )
      );
      setError(null);
    }
  }, [item, schema]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value === '' ? null : value])
    );
    try {
      if (item?.id) await api.patch(`${schema.endpoint}${item.id}/`, payload);
      else await api.post(schema.endpoint, payload);
      onSaved();
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title={item?.id ? 'Edit' : 'Add new'}
      description="This is published on the public portfolio as soon as you save."
      width="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="grid gap-4 sm:grid-cols-2">
          {schema.fields.map(([key, label, type, hint]) => (
            <Field
              key={key}
              label={label}
              htmlFor={`r-${key}`}
              hint={hint}
              className={type === 'textarea' ? 'sm:col-span-2' : undefined}
            >
              {type === 'textarea' ? (
                <Textarea
                  id={`r-${key}`}
                  rows={key === 'description' ? 7 : 3}
                  value={form[key] ?? ''}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                />
              ) : (
                <Input
                  id={`r-${key}`}
                  type={type}
                  value={form[key] ?? ''}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                />
              )}
            </Field>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Publish
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default Content;
