import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Github, Linkedin, Mail, Menu, X } from 'lucide-react';
import api from '../api';
import { cx } from '../lib/format';
import { trackEvent, trackPageView } from '../lib/track';
import { usePortfolio } from './usePortfolio';
import { About, Achievements, Experience, Hero, Section, Work } from './Sections';

const NAV_LINKS = [
  ['#work', 'Work'],
  ['#about', 'About'],
  ['#experience', 'Experience'],
  ['#achievements', 'Recognition'],
  ['#contact', 'Contact'],
];

const Portfolio = () => {
  const { profile, projects, experiences, achievements, loading, failed } = usePortfolio();

  useEffect(() => {
    trackPageView('/');
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <a
        href="#work"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      <Nav profile={profile} />

      <main>
        <Hero profile={profile} loading={loading} />

        {failed && (
          <div className="border-y border-line bg-warning-bg px-6 py-4 text-center text-sm text-warning">
            The content server is waking up — some sections may be empty for a
            moment. Refresh in a minute if they stay that way.
          </div>
        )}

        <Work projects={projects} loading={loading} />
        <About profile={profile} />
        <Experience experiences={experiences} loading={loading} />
        <Achievements achievements={achievements} />
        <Contact profile={profile} />
      </main>

      <Footer profile={profile} />
    </div>
  );
};

/* --------------------------------------------------------------------- nav */

const Nav = ({ profile }) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cx(
        'fixed inset-x-0 top-0 z-40 transition-colors duration-200',
        scrolled ? 'border-b border-line bg-paper/90 backdrop-blur' : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-12 lg:px-20">
        <a href="#top" className="heading-serif text-lg font-semibold text-ink">
          {profile?.full_name || 'Prateek Sahu'}
        </a>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Sections">
          {NAV_LINKS.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="text-sm font-medium text-ink-secondary underline-offset-[6px] transition-colors hover:text-ink hover:underline"
            >
              {label}
            </a>
          ))}
        </nav>

        <button
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="rounded-control border border-line-strong bg-surface p-2 text-ink md:hidden"
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {open && (
        <nav
          className="animate-fadeIn border-t border-line bg-paper px-6 py-4 md:hidden"
          aria-label="Sections"
        >
          {NAV_LINKS.map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block border-b border-line py-3 text-base font-medium text-ink last:border-b-0"
            >
              {label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
};

/* ----------------------------------------------------------------- contact */

const Contact = ({ profile }) => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [state, setState] = useState('idle');
  const [error, setError] = useState(null);

  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setState('sending');
    setError(null);
    try {
      await api.post('/contact/', form);
      setState('sent');
      trackEvent('contact_submit', form.subject);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (caught) {
      setState('idle');
      setError(
        caught?.response?.data?.detail ||
          'That did not go through. The server may be waking up — try once more, or email me directly.'
      );
    }
  };

  const inputClass =
    'w-full border-b border-line-strong bg-transparent py-2.5 text-base text-ink placeholder:text-ink-tertiary transition-colors focus:border-ink focus:outline-none';

  return (
    <Section id="contact" title="Get in touch">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="prose-measure text-lg leading-relaxed text-ink-secondary">
            I&rsquo;m looking for backend and applied-ML roles, and I&rsquo;m happy
            to talk about interesting problems either way. The quickest route is
            this form — it reaches me directly.
          </p>

          <div className="mt-8 space-y-3">
            {profile?.email && (
              <a
                href={`mailto:${profile.email}`}
                onClick={() => trackEvent('email_click')}
                className="flex items-center gap-3 text-base text-ink-secondary transition-colors hover:text-ink"
              >
                <Mail size={17} className="text-ink-tertiary" />
                {profile.email}
              </a>
            )}
            <a
              href={profile?.github_url || 'https://github.com/Prateeks16'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 text-base text-ink-secondary transition-colors hover:text-ink"
            >
              <Github size={17} className="text-ink-tertiary" />
              github.com/Prateeks16
            </a>
            <a
              href={profile?.linkedin_url || 'https://linkedin.com/in/prateeks16'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 text-base text-ink-secondary transition-colors hover:text-ink"
            >
              <Linkedin size={17} className="text-ink-tertiary" />
              linkedin.com/in/prateeks16
            </a>
          </div>
        </div>

        <div className="lg:col-span-7">
          {state === 'sent' ? (
            <div className="flex items-start gap-3 border border-success/30 bg-success-bg px-5 py-6">
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-success" />
              <div>
                <p className="text-base font-semibold text-success">
                  Message received.
                </p>
                <p className="mt-1 text-sm leading-relaxed text-success">
                  I read everything that comes through here and will reply as soon as
                  I can.
                </p>
                <button
                  onClick={() => setState('idle')}
                  className="mt-3 text-sm font-semibold text-success underline underline-offset-4"
                >
                  Send another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-7">
              {error && (
                <p role="alert" className="border-l-2 border-danger pl-3 text-sm text-danger">
                  {error}
                </p>
              )}

              <div className="grid gap-7 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="cf-name"
                    className="text-xs font-bold uppercase tracking-[0.12em] text-ink-tertiary"
                  >
                    Your name
                  </label>
                  <input
                    id="cf-name"
                    required
                    value={form.name}
                    onChange={update('name')}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="cf-email"
                    className="text-xs font-bold uppercase tracking-[0.12em] text-ink-tertiary"
                  >
                    Email
                  </label>
                  <input
                    id="cf-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={update('email')}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="cf-subject"
                  className="text-xs font-bold uppercase tracking-[0.12em] text-ink-tertiary"
                >
                  Subject
                </label>
                <input
                  id="cf-subject"
                  required
                  value={form.subject}
                  onChange={update('subject')}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="cf-message"
                  className="text-xs font-bold uppercase tracking-[0.12em] text-ink-tertiary"
                >
                  Message
                </label>
                <textarea
                  id="cf-message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={update('message')}
                  className={cx(inputClass, 'resize-y leading-relaxed')}
                />
              </div>

              <button
                type="submit"
                disabled={state === 'sending'}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-8 text-sm font-semibold text-white transition-colors hover:bg-ink-secondary disabled:cursor-not-allowed disabled:bg-line-strong"
              >
                {state === 'sending' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </Section>
  );
};

/* ------------------------------------------------------------------ footer */

const Footer = ({ profile }) => (
  <footer className="border-t border-line bg-paper px-6 py-10 md:px-12 lg:px-20">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-ink-tertiary">
        © {new Date().getFullYear()} {profile?.full_name || 'Prateek Sahu'}
      </p>
      <div className="flex items-center gap-5">
        <a
          href={profile?.github_url || 'https://github.com/Prateeks16'}
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          className="text-ink-tertiary transition-colors hover:text-ink"
        >
          <Github size={18} />
        </a>
        <a
          href={profile?.linkedin_url || 'https://linkedin.com/in/prateeks16'}
          target="_blank"
          rel="noreferrer"
          aria-label="LinkedIn"
          className="text-ink-tertiary transition-colors hover:text-ink"
        >
          <Linkedin size={18} />
        </a>
        <Link
          to="/dashboard"
          className="text-sm text-ink-tertiary underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Dashboard
        </Link>
      </div>
    </div>
  </footer>
);

export default Portfolio;
