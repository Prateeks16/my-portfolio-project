import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * A real privacy policy at a real address.
 *
 * Required by Google to publish the OAuth app that sends mail from the CRM, but
 * written to be accurate rather than to satisfy a form: every claim below is
 * checkable against the code. If the tracking changes, this page changes with
 * it -- a policy that has drifted from what the software does is worse than no
 * policy, because it is a promise being quietly broken.
 *
 * Standalone rather than a section of the one-page portfolio: Google needs a
 * dedicated URL, and a legal page does not belong in a scroll-spy.
 */

const UPDATED = '26 August 2026';
const CONTACT = 'prateeks16.outreach@gmail.com';

const Section = ({ title, children }) => (
  <section className="border-t border-white/[0.08] pt-8">
    <h2 className="display-face text-xl font-semibold text-ink">{title}</h2>
    <div className="prose-measure mt-4 space-y-4 text-base leading-relaxed text-ink-secondary">
      {children}
    </div>
  </section>
);

const Privacy = () => {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Privacy — Prateek Sahu';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-paper">
      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-6 md:py-24">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-ink-tertiary transition-colors duration-500 ease-fluid hover:text-ink"
        >
          <ArrowLeft size={15} /> Back to the portfolio
        </Link>

        <h1 className="display-face mt-10 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Privacy
        </h1>
        <p className="mt-3 text-sm text-ink-tertiary">Last updated {UPDATED}</p>

        <div className="mt-10 rounded-panel border border-white/[0.08] bg-white/[0.03] p-6">
          <p className="prose-measure text-base leading-relaxed text-ink-secondary">
            This is a personal portfolio site. It sets{' '}
            <strong className="font-semibold text-ink">no cookies</strong>, runs no
            advertising or third-party analytics, and never stores your IP address.
            It counts page views so I know which projects people actually look at,
            and it stores what you type into the contact form so I can reply. That
            is the whole of it.
          </p>
        </div>

        <div className="mt-12 space-y-10">
          <Section title="When you browse">
            <p>Each page view records:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>the path you visited, and when</li>
              <li>the referring URL, if your browser sent one</li>
              <li>
                your browser&rsquo;s user-agent string, and a coarse device category
                derived from it (mobile, tablet, desktop)
              </li>
              <li>
                a random identifier generated in your browser and held in{' '}
                <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-sm text-ink">
                  sessionStorage
                </code>
              </li>
            </ul>
            <p>
              That identifier is a random value with nothing derived from you or your
              device. It exists so that twelve page views from one person are not
              counted as twelve people. It is not a cookie, it is not shared with
              anyone, and your browser discards it when you close the tab.
            </p>
            <p>
              A handful of named interactions are recorded the same way &mdash; opening
              a project, downloading my r&eacute;sum&eacute;, following a call to action &mdash; so I
              can tell which parts of the site are worth keeping.
            </p>
            <p className="text-ink">
              Your IP address is not stored. There is no fingerprinting, no
              cross-site tracking, and no attempt to identify you.
            </p>
          </Section>

          <Section title="When you use the contact form">
            <p>
              The name, email address, subject and message you submit are stored, and
              forwarded to my mailbox so that I see them. I use them to reply to you
              and to keep track of the conversation if it continues. They are not
              added to any mailing list, and they are never sold or shared for
              marketing.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              None. The site sets no cookies of any kind, which is also why you have
              not been asked to dismiss a consent banner.
            </p>
          </Section>

          <Section title="Who else touches the data">
            <p>
              The site runs on infrastructure I do not own, so those providers
              necessarily process what passes through them:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="font-medium text-ink">Vercel</strong> &mdash; serves the
                site you are reading
              </li>
              <li>
                <strong className="font-medium text-ink">Render</strong> &mdash; runs the
                backend and the database the records above are stored in
              </li>
              <li>
                <strong className="font-medium text-ink">Cloudinary</strong> &mdash; stores
                and serves images
              </li>
              <li>
                <strong className="font-medium text-ink">Google</strong> &mdash; delivers
                mail sent from and to my address, including contact-form
                notifications and any reply I send you
              </li>
            </ul>
            <p>
              Each has its own privacy policy governing what it does as an operator of
              that infrastructure.
            </p>
          </Section>

          <Section title="How long it is kept">
            <p>
              There is no automatic expiry: analytics records and contact messages
              stay until I delete them. I would rather say that plainly than quote a
              retention period the software does not actually enforce.
            </p>
          </Section>

          <Section title="Asking me to delete it">
            <p>
              Email{' '}
              <a
                href={`mailto:${CONTACT}`}
                className="text-ink underline decoration-white/25 underline-offset-4 transition-colors duration-500 ease-fluid hover:decoration-white"
              >
                {CONTACT}
              </a>{' '}
              and I will delete your contact submission and any correspondence. It is
              a small database and I read the mail myself, so this does not need a
              process.
            </p>
            <p>
              Analytics records cannot be traced back to you &mdash; there is nothing in
              them that identifies a person &mdash; so there is nothing there for me to
              single out and remove.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              If what the site collects changes, this page changes at the same time
              and the date at the top moves with it.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about any of the above:{' '}
              <a
                href={`mailto:${CONTACT}`}
                className="text-ink underline decoration-white/25 underline-offset-4 transition-colors duration-500 ease-fluid hover:decoration-white"
              >
                {CONTACT}
              </a>
              , or through the{' '}
              <Link
                to="/contact"
                className="text-ink underline decoration-white/25 underline-offset-4 transition-colors duration-500 ease-fluid hover:decoration-white"
              >
                contact form
              </Link>
              .
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
};

export default Privacy;
