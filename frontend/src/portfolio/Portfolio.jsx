import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Github, Linkedin, Mail } from 'lucide-react';
import api from '../api';
import { cx } from '../lib/format';
import { useCursorGlow } from '../lib/pointer';
import { useReveal } from '../lib/reveal';
import { trackEvent, trackPageView } from '../lib/track';
import { usePortfolio } from './usePortfolio';
import { About, Achievements, Experience, Hero, Pill, Section, Work } from './Sections';

const NAV_LINKS = [
  ['#work', 'Work'],
  ['#about', 'About'],
  ['#experience', 'Experience'],
  ['#achievements', 'Recognition'],
  ['#contact', 'Contact'],
];

const Portfolio = () => {
  const { profile, projects, experiences, achievements, loading, failed } = usePortfolio();
  const glow = useRef(null);
  useCursorGlow(glow);

  useEffect(() => {
    trackPageView('/');
  }, []);

  // Content arrives from the API after first paint, so the observer re-scans
  // once each collection lands.
  useReveal([loading, projects.length, experiences.length, achievements.length]);

  return (
    <div className="min-h-[100dvh] bg-paper">
      <div ref={glow} className="cursor-glow" aria-hidden="true" />

      <a
        href="#work"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-40 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-on-accent"
      >
        Skip to content
      </a>

      <Nav profile={profile} />

      <main>
        <Hero profile={profile} loading={loading} />

        {failed && (
          <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-12 lg:px-20">
            <p className="rounded-panel border border-warning/25 bg-warning-bg px-5 py-4 text-center text-sm text-warning">
              The content server is waking up — some sections may be empty for a
              moment. Refresh in a minute if they stay that way.
            </p>
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

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* A floating island, detached from the top edge — never a bar glued to it. */}
      <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-6">
        <div className="flex w-full max-w-3xl items-center justify-between gap-6 rounded-full border border-white/10 bg-white/[0.05] py-2 pl-5 pr-2 backdrop-blur-2xl md:w-max">
          <a
            href="#top"
            className="display-face whitespace-nowrap text-sm font-semibold text-ink"
          >
            {profile?.full_name || 'Prateek Sahu'}
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
            {NAV_LINKS.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-secondary transition-all duration-500 ease-fluid hover:bg-white/[0.08] hover:text-ink"
              >
                {label}
              </a>
            ))}
          </nav>

          <a
            href="#contact"
            className="hidden rounded-full bg-ink px-5 py-2 text-sm font-semibold text-on-accent transition-all duration-700 ease-fluid hover:bg-white active:scale-[0.98] md:inline-flex"
          >
            Hire me
          </a>

          <button
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="relative h-10 w-10 shrink-0 rounded-full border border-white/10 bg-white/[0.06] transition-colors duration-500 ease-fluid hover:bg-white/[0.12] md:hidden"
          >
            {/* Two lines that fold into an X rather than swapping icons. */}
            <span
              aria-hidden="true"
              className={cx(
                'absolute left-1/2 h-px w-4 -translate-x-1/2 bg-ink transition-all duration-500 ease-fluid',
                open ? 'top-1/2 rotate-45' : 'top-[17px]'
              )}
            />
            <span
              aria-hidden="true"
              className={cx(
                'absolute left-1/2 h-px w-4 -translate-x-1/2 bg-ink transition-all duration-500 ease-fluid',
                open ? 'top-1/2 -rotate-45' : 'top-[23px]'
              )}
            />
          </button>
        </div>
      </header>

      {/* Kept mounted so the links interpolate on the way out as well as in. */}
      <div
        className={cx(
          'fixed inset-0 z-30 bg-black/80 backdrop-blur-3xl transition-opacity duration-700 ease-fluid md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-hidden={!open}
      >
        <nav
          className="flex h-full flex-col justify-center gap-2 px-8"
          aria-label="Sections"
        >
          {NAV_LINKS.map(([href, label], index) => (
            <a
              key={href}
              href={href}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: open ? `${100 + index * 50}ms` : '0ms' }}
              className={cx(
                'display-face text-[2.5rem] leading-tight text-ink transition-all duration-700 ease-fluid',
                open ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
              )}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </>
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

  const inputClass = cx(
    'w-full rounded-control border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-ink',
    'placeholder:text-ink-tertiary transition-all duration-500 ease-fluid',
    'hover:border-white/20 focus:border-white/30 focus:bg-white/[0.06] focus:outline-none'
  );
  const labelClass =
    'mb-2 block text-[0.625rem] font-medium uppercase tracking-[0.2em] text-ink-tertiary';

  return (
    <Section id="contact" eyebrow="Contact" title="Get in touch">
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="reveal lg:col-span-5">
          <div className="bezel h-full">
            <div className="bezel-core flex h-full flex-col p-8 md:p-10">
              <p className="prose-measure text-lg leading-relaxed text-ink-secondary">
                I&rsquo;m looking for backend and applied-ML roles, and I&rsquo;m happy
                to talk about interesting problems either way. The quickest route is
                this form — it reaches me directly.
              </p>

              <div className="mt-8 space-y-1">
                {profile?.email && (
                  <ContactLink
                    icon={Mail}
                    href={`mailto:${profile.email}`}
                    onClick={() => trackEvent('email_click')}
                  >
                    {profile.email}
                  </ContactLink>
                )}
                <ContactLink
                  icon={Github}
                  href={profile?.github_url || 'https://github.com/Prateeks16'}
                  external
                >
                  github.com/Prateeks16
                </ContactLink>
                <ContactLink
                  icon={Linkedin}
                  href={profile?.linkedin_url || 'https://linkedin.com/in/prateeks16'}
                  external
                >
                  linkedin.com/in/prateeks16
                </ContactLink>
              </div>
            </div>
          </div>
        </div>

        <div className="reveal lg:col-span-7" style={{ '--d': '120ms' }}>
          <div className="bezel h-full">
            <div className="bezel-core h-full p-8 md:p-10">
              {state === 'sent' ? (
                /* The one conversion this page exists to produce, so it gets
                   the delight budget: a 400ms rise instead of a hard swap.
                   Announced politely now that it no longer appears instantly. */
                <div
                  role="status"
                  aria-live="polite"
                  style={{ animationDuration: '400ms' }}
                  className="animate-riseIn flex items-start gap-3.5 rounded-panel border border-success/25 bg-success-bg px-5 py-6"
                >
                  <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-success" />
                  <div>
                    <p className="text-base font-semibold text-success">
                      Message received.
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-success/80">
                      I read everything that comes through here and will reply as soon
                      as I can.
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
                <form onSubmit={submit} className="space-y-6">
                  {error && (
                    <p
                      role="alert"
                      className="rounded-control border border-danger/25 bg-danger-bg px-4 py-3 text-sm text-danger"
                    >
                      {error}
                    </p>
                  )}

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="cf-name" className={labelClass}>
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
                      <label htmlFor="cf-email" className={labelClass}>
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
                    <label htmlFor="cf-subject" className={labelClass}>
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
                    <label htmlFor="cf-message" className={labelClass}>
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

                  <Pill
                    as="button"
                    type="submit"
                    disabled={state === 'sending'}
                    icon={Mail}
                    className="disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {state === 'sending' ? 'Sending…' : 'Send message'}
                  </Pill>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};

const ContactLink = ({ icon: Icon, href, external, onClick, children }) => (
  <a
    href={href}
    onClick={onClick}
    {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
    className="group flex items-center gap-3.5 rounded-control px-3 py-3 text-base text-ink-secondary transition-all duration-500 ease-fluid hover:bg-white/[0.05] hover:text-ink"
  >
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] transition-all duration-700 ease-fluid group-hover:scale-105 group-hover:bg-white/[0.12]">
      <Icon size={15} />
    </span>
    <span className="truncate">{children}</span>
  </a>
);

/* ------------------------------------------------------------------ footer */

const Footer = ({ profile }) => (
  <footer className="px-4 pb-12 sm:px-6 md:px-12 lg:px-20">
    <div className="mx-auto max-w-6xl">
      <div className="bezel">
        <div className="bezel-core flex flex-wrap items-center justify-between gap-4 px-6 py-5 md:px-8">
          <p className="text-sm text-ink-tertiary">
            © {new Date().getFullYear()} {profile?.full_name || 'Prateek Sahu'}
          </p>
          <div className="flex items-center gap-1">
            <a
              href={profile?.github_url || 'https://github.com/Prateeks16'}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-tertiary transition-all duration-500 ease-fluid hover:bg-white/[0.07] hover:text-ink"
            >
              <Github size={17} />
            </a>
            <a
              href={profile?.linkedin_url || 'https://linkedin.com/in/prateeks16'}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-tertiary transition-all duration-500 ease-fluid hover:bg-white/[0.07] hover:text-ink"
            >
              <Linkedin size={17} />
            </a>
            <Link
              to="/dashboard"
              className="ml-2 rounded-full px-4 py-2 text-sm text-ink-tertiary transition-all duration-500 ease-fluid hover:bg-white/[0.07] hover:text-ink"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

export default Portfolio;
