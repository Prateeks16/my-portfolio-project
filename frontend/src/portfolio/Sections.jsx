import React, { useState } from 'react';
import {
  ArrowUpRight,
  Award,
  ExternalLink,
  Github,
  Linkedin,
  Mail,
  MapPin,
  Minus,
  Plus,
} from 'lucide-react';
import { cx, formatDate, formatDateRange, parseTechStack, toBullets } from '../lib/format';
import { trackEvent } from '../lib/track';
import { getImageUrl } from './usePortfolio';

/* Skills come from the resume; the skills tables in the database are empty and
   inventing rows there would put unverified claims on the public site. */
export const SKILL_GROUPS = [
  { name: 'Languages', items: ['Python', 'Java', 'SQL', 'JavaScript', 'Go'] },
  { name: 'Frameworks', items: ['Django', 'FastAPI', 'React', 'Streamlit', 'Spring Boot'] },
  {
    name: 'ML & data',
    items: [
      'PyTorch',
      'TensorFlow',
      'HuggingFace',
      'scikit-learn',
      'pandas',
      'NumPy',
      'spaCy',
      'NLTK',
    ],
  },
  { name: 'Infrastructure', items: ['PostgreSQL', 'Qdrant', 'AWS', 'Docker', 'Render'] },
];

export const Section = ({ id, title, aside, children, dark, className }) => (
  <section
    id={id}
    className={cx(
      'border-t px-6 py-20 md:px-12 md:py-28 lg:px-20',
      dark ? 'border-white/10 bg-[#171512] text-[#EDEAE4]' : 'border-line bg-paper',
      className
    )}
  >
    <div className="mx-auto max-w-6xl">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-4 md:mb-16">
        <h2
          className={cx(
            'heading-serif text-[2.25rem] leading-[1.05] md:text-[3.25rem]',
            dark ? 'text-white' : 'text-ink'
          )}
        >
          {title}
        </h2>
        {aside && (
          <p className={cx('text-sm', dark ? 'text-white/50' : 'text-ink-tertiary')}>
            {aside}
          </p>
        )}
      </div>
      {children}
    </div>
  </section>
);

/* --------------------------------------------------------------------- hero */

export const Hero = ({ profile, loading }) => {
  const first = profile?.full_name?.split(' ')[0] || 'Prateek';
  const last = profile?.full_name?.split(' ').slice(1).join(' ') || 'Sahu';

  return (
    <section
      id="top"
      className="relative flex min-h-[92vh] flex-col justify-center px-6 pb-16 pt-32 md:px-12 lg:px-20"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-8">
            <h1 className="display-xl animate-riseIn text-[3.5rem] text-ink sm:text-[5rem] md:text-[6.5rem] lg:text-[7.5rem]">
              {first}
              <br />
              {last}
            </h1>

            <p
              className="prose-measure mt-8 animate-riseIn text-lg leading-relaxed text-ink-secondary md:text-xl"
              style={{ animationDelay: '90ms' }}
            >
              I build backend systems and the machine learning that runs inside them —
              retrieval pipelines, NLP classifiers, and the APIs that carry them to
              production.
            </p>

            <div
              className="mt-10 flex animate-riseIn items-center gap-5"
              style={{ animationDelay: '160ms' }}
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-line-strong shadow-sm">
                {loading ? (
                  <div className="skeleton h-full w-full" />
                ) : profile?.profile_picture ? (
                  <img
                    src={getImageUrl(profile.profile_picture)}
                    alt=""
                    className="h-full w-full object-cover"
                    width="64"
                    height="64"
                  />
                ) : (
                  <div className="h-full w-full bg-line" />
                )}
              </div>
              <div className="flex flex-col gap-1.5 border-l border-line-strong pl-5">
                <span className="text-xs font-bold uppercase leading-none tracking-[0.14em] text-ink">
                  Backend Engineering
                </span>
                <span className="text-xs font-bold uppercase leading-none tracking-[0.14em] text-ink">
                  Applied Machine Learning
                </span>
              </div>
            </div>
          </div>

          <div
            className="animate-riseIn border-t border-line pt-8 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-2"
            style={{ animationDelay: '220ms' }}
          >
            <dl className="mb-8 space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">
                  Currently
                </dt>
                <dd className="mt-1 text-base text-ink">
                  B.Tech Computer Science, 2027
                  <span className="block text-sm text-ink-secondary">
                    Galgotias College of Engineering
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">
                  Based in
                </dt>
                <dd className="mt-1 text-base text-ink">
                  {profile?.location || 'Greater Noida, India'}
                </dd>
              </div>
            </dl>

            <div className="space-y-3.5">
              <QuickLink
                label="Read my résumé"
                href={getImageUrl(profile?.resume_pdf)}
                event="resume_open"
              />
              <QuickLink
                label="GitHub"
                href={profile?.github_url || 'https://github.com/Prateeks16'}
                event="github_open"
              />
              <QuickLink
                label="LinkedIn"
                href={profile?.linkedin_url || 'https://linkedin.com/in/prateeks16'}
                event="linkedin_open"
              />
              <a
                href="#contact"
                className="group flex items-center gap-3 text-base font-medium text-ink-secondary transition-colors hover:text-ink"
              >
                <ArrowUpRight
                  size={19}
                  className="text-ink-tertiary transition-colors group-hover:text-ink"
                />
                <span className="border-b border-transparent pb-0.5 transition-colors group-hover:border-ink">
                  Get in touch
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const QuickLink = ({ label, href, event }) =>
  href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackEvent(event, label)}
      className="group flex items-center gap-3 text-base font-medium text-ink-secondary transition-colors hover:text-ink"
    >
      <ArrowUpRight
        size={19}
        className="text-ink-tertiary transition-colors group-hover:text-ink"
      />
      <span className="border-b border-transparent pb-0.5 transition-colors group-hover:border-ink">
        {label}
      </span>
    </a>
  ) : null;

/* ------------------------------------------------------------------- work */

export const Work = ({ projects, loading }) => (
  <Section
    id="work"
    title="Selected work"
    aside={projects.length > 0 ? `${projects.length} projects` : undefined}
  >
    {loading ? (
      <div className="space-y-16">
        {[0, 1].map((index) => (
          <div key={index} className="grid gap-8 md:grid-cols-2">
            <div className="skeleton aspect-[4/3] w-full rounded-lg" />
            <div className="space-y-3 py-4">
              <div className="skeleton h-8 w-3/4" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
            </div>
          </div>
        ))}
      </div>
    ) : projects.length === 0 ? (
      <p className="text-lg text-ink-secondary">Projects are being updated.</p>
    ) : (
      <div className="space-y-20 md:space-y-28">
        {projects.map((project, index) => (
          <ProjectBlock key={project.id} project={project} index={index} />
        ))}
      </div>
    )}
  </Section>
);

const ProjectBlock = ({ project, index }) => {
  const [open, setOpen] = useState(false);
  const tech = parseTechStack(project.tech_stack);
  const image = getImageUrl(project.image);
  const flip = index % 2 === 1;

  return (
    <article className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
      <div className={cx('order-1', flip && 'md:order-2')}>
        {image ? (
          <img
            src={image}
            alt={`${project.title} interface`}
            loading="lazy"
            className="aspect-[4/3] w-full rounded-lg border border-line object-cover shadow-panel"
          />
        ) : (
          <div className="aspect-[4/3] w-full rounded-lg border border-line bg-surface-sunk" />
        )}
      </div>

      <div className={cx('order-2', flip && 'md:order-1')}>
        <h3 className="heading-serif text-[1.75rem] leading-tight text-ink md:text-[2.25rem]">
          {project.title}
        </h3>

        <p className="prose-measure mt-4 text-base leading-relaxed text-ink-secondary md:text-lg">
          {project.short_description}
        </p>

        {open && project.description && (
          <p className="prose-measure mt-4 animate-fadeIn whitespace-pre-line text-base leading-relaxed text-ink-secondary">
            {project.description}
          </p>
        )}

        {tech.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {tech.map((item) => (
              <li
                key={item}
                className="rounded-full border border-line-strong px-2.5 py-1 text-xs font-medium text-ink-secondary"
              >
                {item}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          {project.description && (
            <button
              onClick={() => {
                setOpen((value) => !value);
                if (!open) trackEvent('project_expand', project.title);
              }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline-offset-4 hover:underline"
            >
              {open ? <Minus size={14} /> : <Plus size={14} />}
              {open ? 'Show less' : 'Read more'}
            </button>
          )}
          {project.github_url && (
            <a
              href={project.github_url}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent('project_code', project.title)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-secondary underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              <Github size={14} /> Code
            </a>
          )}
          {project.live_demo_url && project.live_demo_url !== project.github_url && (
            <a
              href={project.live_demo_url}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent('project_demo', project.title)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-secondary underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              <ExternalLink size={14} /> Live demo
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

/* ------------------------------------------------------------------- about */

export const About = ({ profile }) => (
  <Section id="about" title="About">
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <p className="prose-measure whitespace-pre-line text-lg leading-relaxed text-ink-secondary md:text-xl">
          {profile?.bio ||
            'Computer Science undergraduate focused on backend development and applied AI.'}
        </p>
      </div>

      <div className="lg:col-span-5 lg:pl-8">
        <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.14em] text-ink-tertiary">
          What I work with
        </h3>
        <dl className="space-y-5">
          {SKILL_GROUPS.map((group) => (
            <div key={group.name} className="border-t border-line pt-3">
              <dt className="mb-2 text-sm font-semibold text-ink">{group.name}</dt>
              <dd className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-ink-secondary">
                {group.items.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  </Section>
);

/* -------------------------------------------------------------- experience */

export const Experience = ({ experiences, loading }) => (
  <Section
    id="experience"
    title="Experience"
    aside={experiences.length > 0 ? `${experiences.length} positions` : undefined}
    dark
  >
    {loading ? (
      <div className="space-y-8">
        {[0, 1].map((index) => (
          <div key={index} className="skeleton h-24 w-full opacity-20" />
        ))}
      </div>
    ) : (
      <ol className="space-y-0">
        {experiences.map((role) => (
          <li
            key={role.id}
            className="grid gap-4 border-b border-white/10 py-8 md:grid-cols-12 md:gap-8"
          >
            <div className="md:col-span-3">
              <p className="text-sm text-white/50">
                {formatDateRange(role.start_date, role.end_date)}
              </p>
              {role.location && (
                <p className="mt-1 text-sm text-white/55">{role.location}</p>
              )}
            </div>

            <div className="md:col-span-9">
              <h3 className="heading-serif text-xl text-white md:text-2xl">
                {role.position}
              </h3>
              <p className="mt-1 text-base text-white/60">{role.company_name}</p>

              <div className="prose-measure mt-4 space-y-1.5">
                {toBullets(role.description).map((line, index) => (
                  <p
                    key={index}
                    className="flex gap-2.5 text-[0.95rem] leading-relaxed text-white/65"
                  >
                    <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-white/30" />
                    {line}
                  </p>
                ))}
              </div>

              {role.tech_stack?.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {role.tech_stack
                    .map((item) => item.replace(/[[\]"]/g, '').trim())
                    .filter(Boolean)
                    .map((item) => (
                      <li
                        key={item}
                        className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/55"
                      >
                        {item}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    )}
  </Section>
);

/* ------------------------------------------------------------ achievements */

export const Achievements = ({ achievements }) =>
  achievements.length === 0 ? null : (
    <Section id="achievements" title="Recognition">
      <div className="grid gap-8 md:grid-cols-2">
        {achievements.map((item) => (
          <article key={item.id} className="border-t border-line-strong pt-6">
            <div className="mb-3 flex items-center gap-2.5 text-ink-tertiary">
              <Award size={16} />
              <span className="text-xs font-bold uppercase tracking-[0.12em]">
                {item.achievement_type || 'Award'}
              </span>
              <span className="text-xs text-ink-tertiary">· {formatDate(item.date)}</span>
            </div>

            <h3 className="heading-serif text-xl text-ink md:text-2xl">{item.title}</h3>
            {item.organization && (
              <p className="mt-1 text-sm text-ink-secondary">{item.organization}</p>
            )}

            <div className="mt-3 space-y-1.5">
              {toBullets(item.description).map((line, index) => (
                <p key={index} className="text-[0.95rem] leading-relaxed text-ink-secondary">
                  {line}
                </p>
              ))}
            </div>

            {item.certificate_url && (
              <a
                href={item.certificate_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline-offset-4 hover:underline"
              >
                <ExternalLink size={13} /> Certificate
              </a>
            )}
          </article>
        ))}
      </div>
    </Section>
  );

export { Mail, MapPin, Github, Linkedin };
