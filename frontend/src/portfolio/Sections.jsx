import React, { useRef, useState } from 'react';
import {
  ArrowUpRight,
  Award,
  ExternalLink,
  Github,
  Minus,
  Plus,
} from 'lucide-react';
import {
  cx,
  formatDate,
  formatDateRange,
  initials,
  parseTechStack,
  toBullets,
} from '../lib/format';
import { useMagnetic, useMagnify, useSpotlight, useTilt } from '../lib/pointer';
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

/* ------------------------------------------------------------------ pieces */

/**
 * The island CTA. A trailing glyph never sits naked beside the label — it lives
 * in its own circular well flush with the pill's inner padding, and carries the
 * kinetic tension on hover while the pill itself presses under the pointer.
 */
export const Pill = ({
  as: Tag = 'a',
  tone = 'solid',
  icon: Icon = ArrowUpRight,
  children,
  className,
  ...rest
}) => {
  const tones = {
    solid:
      'bg-ink text-on-accent hover:bg-white shadow-[0_18px_40px_-20px_rgba(255,255,255,0.55)]',
    glass:
      'bg-white/[0.06] text-ink border border-white/10 hover:bg-white/[0.1] hover:border-white/20',
  };
  const wells = {
    solid: 'bg-black/10 group-hover:bg-black/[0.14]',
    glass: 'bg-white/10 group-hover:bg-white/[0.16]',
  };

  return (
    <Tag
      className={cx(
        'group inline-flex items-center gap-3 rounded-full py-2 pl-6 pr-2 text-sm font-semibold',
        'transition-all duration-700 ease-fluid active:scale-[0.98]',
        tones[tone],
        className
      )}
      {...rest}
    >
      {children}
      <span
        aria-hidden="true"
        className={cx(
          'flex h-9 w-9 items-center justify-center rounded-full',
          'transition-all duration-700 ease-fluid',
          'group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105',
          wells[tone]
        )}
      >
        <Icon size={16} />
      </span>
    </Tag>
  );
};

export const Section = ({ id, eyebrow, title, aside, children, className }) => (
  <section
    id={id}
    className={cx('px-4 py-24 sm:px-6 md:px-12 md:py-40 lg:px-20', className)}
  >
    <div className="mx-auto max-w-6xl">
      <div className="reveal mb-14 flex flex-wrap items-end justify-between gap-6 md:mb-20">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 className="display-face mt-5 text-[2.5rem] leading-[0.95] text-ink md:text-[4rem]">
            {title}
          </h2>
        </div>
        {aside && (
          <p className="text-sm text-ink-tertiary md:pb-3">{aside}</p>
        )}
      </div>
      {children}
    </div>
  </section>
);

/**
 * Text split per character so each letter can be scaled independently — a
 * single text node cannot. The letters are hidden from assistive tech and the
 * wrapper carries the real string, so the name is still announced as a name.
 *
 * `origin-[0%_100%]` anchors every letter to its left baseline: growing from
 * the centre would drift the line vertically, and growing from the right would
 * push the word backwards into its own start.
 */
const MagnifyText = ({ text, className }) => {
  const line = useRef(null);
  useMagnify(line);

  return (
    <span ref={line} aria-label={text} className={cx('inline-block', className)}>
      {[...text].map((character, index) => (
        <span
          key={`${character}-${index}`}
          data-letter
          aria-hidden="true"
          className="inline-block origin-[0%_100%] will-change-transform"
        >
          {character === ' ' ? '\u00A0' : character}
        </span>
      ))}
    </span>
  );
};

/** Outer tray + inner plate. Never place a card flatly on the ground. */
const Bezel = ({ ref, className, coreClassName, children, ...rest }) => (
  <div ref={ref} className={cx('bezel', className)} {...rest}>
    <div className={cx('bezel-core h-full', coreClassName)}>{children}</div>
  </div>
);

/* --------------------------------------------------------------------- hero */

export const Hero = ({ profile, loading }) => {
  const first = profile?.full_name?.split(' ')[0] || 'Prateek';
  const last = profile?.full_name?.split(' ').slice(1).join(' ') || 'Sahu';

  // The magnet rides a wrapper, not the pill: `Pill` carries
  // `active:scale-[0.98]`, and an inline transform here would kill the press.
  const workPill = useRef(null);
  const contactPill = useRef(null);
  useMagnetic(workPill);
  useMagnetic(contactPill);

  // The two glass plates in the hero lean toward the cursor and magnify a
  // little. Both sit on their own wrapper: their parents are mid-`riseIn`, and
  // that animation owns their transform.
  const elsewhere = useRef(null);
  const portrait = useRef(null);
  useTilt(elsewhere);
  useTilt(portrait, { maxTilt: 10, magnify: 1.05 });

  return (
    <section
      id="top"
      className="relative flex min-h-[100dvh] flex-col justify-center px-4 pb-24 pt-40 sm:px-6 md:px-12 lg:px-20"
    >
      <div className="mx-auto w-full max-w-6xl">
        <span className="eyebrow animate-riseIn">Backend · Applied ML</span>

        <h1 className="display-xl animate-riseIn mt-8 text-[3.5rem] text-ink sm:text-[5.5rem] md:text-[7rem] lg:text-[8.5rem]">
          <MagnifyText text={first} />
          <br />
          <MagnifyText text={last} className="text-ink-secondary" />
        </h1>

        <div className="mt-14 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <p
              className="prose-measure animate-riseIn text-lg leading-relaxed text-ink-secondary md:text-xl"
              style={{ animationDelay: '120ms' }}
            >
              I build backend systems and the machine learning that runs inside them —
              retrieval pipelines, NLP classifiers, and the APIs that carry them to
              production.
            </p>

            <div
              className="animate-riseIn mt-10 flex flex-wrap items-center gap-3"
              style={{ animationDelay: '200ms' }}
            >
              <span ref={workPill} className="inline-block will-change-transform">
                <Pill href="#work">See the work</Pill>
              </span>
              <span ref={contactPill} className="inline-block will-change-transform">
                <Pill tone="glass" href="#contact">
                  Get in touch
                </Pill>
              </span>
            </div>

            <div
              className="animate-riseIn mt-12 flex items-center gap-5"
              style={{ animationDelay: '280ms' }}
            >
              <div ref={portrait} className="bezel-sm h-20 w-20 shrink-0 will-change-transform">
                <div className="bezel-sm-core h-full w-full overflow-hidden">
                  {loading ? (
                    <div className="skeleton h-full w-full" />
                  ) : profile?.profile_picture ? (
                    <img
                      src={getImageUrl(profile.profile_picture)}
                      alt=""
                      className="h-full w-full object-cover"
                      width="80"
                      height="80"
                    />
                  ) : (
                    <div className="h-full w-full bg-white/5" />
                  )}
                </div>
              </div>
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-[0.625rem] uppercase tracking-[0.2em] text-ink-tertiary">
                    Currently
                  </dt>
                  <dd className="mt-1 text-ink">
                    B.Tech Computer Science, 2027
                    <span className="block text-ink-secondary">
                      Galgotias College of Engineering
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.625rem] uppercase tracking-[0.2em] text-ink-tertiary">
                    Based in
                  </dt>
                  <dd className="mt-1 text-ink">
                    {profile?.location || 'Greater Noida, India'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div
            className="animate-riseIn lg:col-span-5"
            style={{ animationDelay: '340ms' }}
          >
            <Bezel ref={elsewhere} className="will-change-transform" coreClassName="p-6 md:p-8">
              <p className="text-[0.625rem] uppercase tracking-[0.2em] text-ink-tertiary">
                Elsewhere
              </p>
              <div className="mt-5 space-y-1">
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
              </div>
            </Bezel>
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
      className={cx(
        'group flex items-center justify-between gap-3 rounded-control px-3 py-3 text-base font-medium',
        'text-ink-secondary transition-all duration-500 ease-fluid',
        'hover:bg-white/[0.05] hover:text-ink'
      )}
    >
      {label}
      <span
        aria-hidden="true"
        className={cx(
          'flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06]',
          'transition-all duration-700 ease-fluid',
          'group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105 group-hover:bg-white/[0.12]'
        )}
      >
        <ArrowUpRight size={15} />
      </span>
    </a>
  ) : null;

/* --------------------------------------------------------------------- work */

/* A bento never runs symmetrical: wide and narrow alternate so no two rows
   read the same. Every span collapses to one column below md. */
const SPANS = ['md:col-span-4', 'md:col-span-2', 'md:col-span-2', 'md:col-span-4'];

export const Work = ({ projects, loading }) => {
  const grid = useRef(null);
  useSpotlight(grid);

  return (
  <Section
    id="work"
    eyebrow="Selected work"
    title="Things I shipped"
    aside={projects.length > 0 ? `${projects.length} projects` : undefined}
  >
    {loading ? (
      <div className="grid gap-5 md:grid-cols-6">
        {[0, 1, 2].map((index) => (
          <div key={index} className={cx('bezel', SPANS[index])}>
            <div className="bezel-core space-y-4 p-8">
              <div className="skeleton h-8 w-2/3" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    ) : projects.length === 0 ? (
      <p className="text-lg text-ink-secondary">Projects are being updated.</p>
    ) : (
      <div ref={grid} className="grid gap-5 md:grid-cols-6">
        {projects.map((project, index) => (
          <ProjectCard key={project.id} project={project} index={index} />
        ))}
      </div>
    )}
  </Section>
  );
};

/* Backend and infrastructure work has nothing to screenshot, and a grey box
   reads as a broken image. So a project without one gets a drawn plate instead:
   a hairline field picked deterministically from its title, and its monogram
   cut out of the glass. Same title always draws the same plate. */
const GLYPH_FIELDS = [
  {
    backgroundImage:
      'radial-gradient(circle at 50% 50%, transparent 0 17%, rgba(255,255,255,0.07) 17% 17.4%, transparent 17.4% 30%, rgba(255,255,255,0.055) 30% 30.4%, transparent 30.4% 43%, rgba(255,255,255,0.04) 43% 43.4%, transparent 43.4%)',
  },
  {
    backgroundImage:
      'repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 14px)',
  },
  {
    backgroundImage:
      'radial-gradient(circle at center, rgba(255,255,255,0.1) 1px, transparent 1.3px)',
    backgroundSize: '18px 18px',
  },
  {
    backgroundImage:
      'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 16px)',
  },
];

const fieldFor = (title = '') =>
  GLYPH_FIELDS[
    [...title].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7) %
      GLYPH_FIELDS.length
  ];

const ProjectGlyph = ({ title, className }) => (
  <div
    aria-hidden="true"
    className={cx('relative overflow-hidden bg-white/[0.02]', className)}
  >
    <div className="absolute inset-0" style={fieldFor(title)} />
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(70% 90% at 22% 0%, rgba(255,255,255,0.07), transparent 70%)',
      }}
    />
    <span className="display-face absolute inset-0 flex items-center justify-center text-[3.5rem] font-medium text-white/[0.12] transition-colors duration-700 ease-fluid group-hover:text-white/20">
      {initials(title)}
    </span>
  </div>
);

const ProjectCard = ({ project, index }) => {
  const [open, setOpen] = useState(false);
  const tech = parseTechStack(project.tech_stack);
  const image = getImageUrl(project.image);
  const span = SPANS[index % SPANS.length];
  const wide = span === 'md:col-span-4';

  return (
    <article
      data-spotlight
      className={cx(
        'bezel reveal group transition-transform duration-700 ease-fluid hover:-translate-y-1',
        span
      )}
      style={{ '--d': `${(index % 3) * 90}ms` }}
    >
      <div className="bezel-core relative flex h-full flex-col overflow-hidden">
        <span className="spotlight" aria-hidden="true" />
        {/* Every card carries a plate, so no cell in the bento reads as unfinished. */}
        <div className="overflow-hidden rounded-t-core border-b border-white/[0.06]">
          {image ? (
            <img
              src={image}
              alt={`${project.title} interface`}
              loading="lazy"
              className={cx(
                'w-full object-cover opacity-90 transition-all duration-700 ease-fluid group-hover:scale-[1.03] group-hover:opacity-100',
                wide ? 'aspect-[16/9]' : 'aspect-[4/3]'
              )}
            />
          ) : (
            <ProjectGlyph
              title={project.title}
              className={cx('w-full', wide ? 'aspect-[16/9]' : 'aspect-[4/3]')}
            />
          )}
        </div>

        <div className="flex flex-1 flex-col p-6 md:p-8">
          <h3
            className={cx(
              'display-face leading-tight text-ink',
              wide ? 'text-[1.75rem] md:text-[2rem]' : 'text-[1.5rem]'
            )}
          >
            {project.title}
          </h3>

          <p className="prose-measure mt-3 text-base leading-relaxed text-ink-secondary">
            {project.short_description}
          </p>

          {/* `grid-template-rows: 0fr → 1fr` reaches the content's natural
              height without measuring it, and stays mounted so the collapse
              animates too. `overflow-hidden` belongs on the inner element —
              that is what lets the row close. */}
          {project.description && (
            <div
              className={cx(
                'grid transition-all duration-300 ease-fluid',
                open ? 'mt-4 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
              )}
            >
              <p className="prose-measure overflow-hidden whitespace-pre-line text-base leading-relaxed text-ink-secondary">
                {project.description}
              </p>
            </div>
          )}

          {tech.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-1.5">
              {tech.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.6875rem] font-medium text-ink-secondary"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-6">
            {project.description && (
              <button
                onClick={() => {
                  setOpen((value) => !value);
                  if (!open) trackEvent('project_expand', project.title);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink transition-colors duration-500 ease-fluid hover:text-ink-secondary"
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
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-secondary transition-colors duration-500 ease-fluid hover:text-ink"
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
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-secondary transition-colors duration-500 ease-fluid hover:text-ink"
              >
                <ExternalLink size={14} /> Live demo
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

/* -------------------------------------------------------------------- about */

export const About = ({ profile }) => (
  <Section id="about" eyebrow="About" title="How I work">
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="reveal lg:col-span-7">
        <Bezel coreClassName="h-full p-8 md:p-12">
          <p className="prose-measure whitespace-pre-line text-lg leading-relaxed text-ink-secondary md:text-xl">
            {profile?.bio ||
              'Computer Science undergraduate focused on backend development and applied AI.'}
          </p>
        </Bezel>
      </div>

      <div className="reveal lg:col-span-5" style={{ '--d': '120ms' }}>
        <Bezel coreClassName="h-full p-8 md:p-10">
          <p className="text-[0.625rem] uppercase tracking-[0.2em] text-ink-tertiary">
            What I work with
          </p>
          <dl className="mt-6 space-y-5">
            {SKILL_GROUPS.map((group) => (
              <div key={group.name} className="border-t border-white/[0.07] pt-4">
                <dt className="mb-2 text-sm font-semibold text-ink">{group.name}</dt>
                <dd className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-ink-secondary">
                  {group.items.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </Bezel>
      </div>
    </div>
  </Section>
);

/* --------------------------------------------------------------- experience */

export const Experience = ({ experiences, loading }) => (
  <Section
    id="experience"
    eyebrow="Experience"
    title="Where I have worked"
    aside={experiences.length > 0 ? `${experiences.length} positions` : undefined}
  >
    <div className="reveal bezel">
      <div className="bezel-core divide-y divide-white/[0.06]">
        {loading
          ? [0, 1].map((index) => (
              <div key={index} className="space-y-3 p-8 md:p-12">
                <div className="skeleton h-6 w-1/3" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            ))
          : experiences.map((role) => (
              <article key={role.id} className="grid gap-6 p-8 md:grid-cols-12 md:gap-10 md:p-12">
                <div className="md:col-span-3">
                  <p className="tabular text-sm text-ink-tertiary">
                    {formatDateRange(role.start_date, role.end_date)}
                  </p>
                  {role.location && (
                    <p className="mt-1 text-sm text-ink-tertiary">{role.location}</p>
                  )}
                </div>

                <div className="md:col-span-9">
                  <h3 className="display-face text-xl text-ink md:text-2xl">
                    {role.position}
                  </h3>
                  <p className="mt-1 text-base text-ink-secondary">{role.company_name}</p>

                  <div className="prose-measure mt-5 space-y-2">
                    {toBullets(role.description).map((line, index) => (
                      <p
                        key={index}
                        className="flex gap-3 text-[0.95rem] leading-relaxed text-ink-secondary"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2.5 h-px w-3.5 shrink-0 bg-white/25"
                        />
                        {line}
                      </p>
                    ))}
                  </div>

                  {role.tech_stack?.length > 0 && (
                    <ul className="mt-5 flex flex-wrap gap-1.5">
                      {role.tech_stack
                        .map((item) => item.replace(/[[\]"]/g, '').trim())
                        .filter(Boolean)
                        .map((item) => (
                          <li
                            key={item}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.6875rem] text-ink-secondary"
                          >
                            {item}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}
      </div>
    </div>
  </Section>
);

/* ------------------------------------------------------------ achievements */

export const Achievements = ({ achievements }) => {
  const grid = useRef(null);
  useSpotlight(grid);

  return achievements.length === 0 ? null : (
    <Section id="achievements" eyebrow="Recognition" title="Placed and awarded">
      <div ref={grid} className="grid gap-5 md:grid-cols-6">
        {achievements.map((item, index) => (
          <article
            key={item.id}
            data-spotlight
            className={cx(
              'bezel reveal transition-transform duration-700 ease-fluid hover:-translate-y-1',
              index % 3 === 0 ? 'md:col-span-4' : 'md:col-span-2'
            )}
            style={{ '--d': `${(index % 3) * 90}ms` }}
          >
            <div className="bezel-core relative h-full overflow-hidden p-8">
              <span className="spotlight" aria-hidden="true" />
              <div className="flex items-center gap-2.5 text-ink-tertiary">
                <Award size={15} />
                <span className="text-[0.625rem] uppercase tracking-[0.2em]">
                  {item.achievement_type || 'Award'}
                </span>
                <span className="tabular text-[0.625rem] uppercase tracking-[0.2em]">
                  · {formatDate(item.date)}
                </span>
              </div>

              <h3 className="display-face mt-5 text-xl text-ink md:text-2xl">
                {item.title}
              </h3>
              {item.organization && (
                <p className="mt-1 text-sm text-ink-secondary">{item.organization}</p>
              )}

              <div className="mt-4 space-y-2">
                {toBullets(item.description).map((line, lineIndex) => (
                  <p
                    key={lineIndex}
                    className="text-[0.95rem] leading-relaxed text-ink-secondary"
                  >
                    {line}
                  </p>
                ))}
              </div>

              {item.certificate_url && (
                <a
                  href={item.certificate_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink transition-colors duration-500 ease-fluid hover:text-ink-secondary"
                >
                  <ExternalLink size={13} /> Certificate
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
};
