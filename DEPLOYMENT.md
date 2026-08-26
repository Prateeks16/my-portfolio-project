# Deployment

Two services, one repository.

| Piece | Where it runs | Deploys when |
|---|---|---|
| `frontend/` — portfolio + CRM | Vercel | you push to the branch Vercel tracks |
| `backend/` — Django API | Render | you push to the branch Render tracks |

Nothing in this repository deploys itself. Everything below is a step you take.

---

## Will the site be live on prateeks16.in?

**Not on its own — it needs two things only you can do.** The code side is finished:
the domain is already in the backend's CORS and CSRF allow-lists, the canonical and
Open Graph tags point at `https://prateeks16.in/`, and `{{my_portfolio}}` in your
outreach templates resolves to it. What is left is account and DNS work:

**1. Add the domain in Vercel**
Project → Settings → Domains → add `prateeks16.in`, and add `www.prateeks16.in`
redirecting to the apex (or the other way round — pick one as canonical and keep it
consistent with the `<link rel="canonical">` in `frontend/index.html`).

**2. Point DNS at Vercel from your registrar**
Vercel prints the exact records to create once you add the domain. Use those values
rather than any written here — they change, and the panel is the source of truth. For
a `.in` apex domain it is normally an `A` record on `@` plus a `CNAME` on `www`.

Propagation is usually minutes but can take up to a few hours. Vercel issues the TLS
certificate automatically once the records resolve; you do not buy or upload one.

**3. Nothing else changes.** The frontend calls the API by absolute URL, so moving the
site to a new domain does not touch the backend beyond the CORS entry that is already
there. If you later use a domain that is *not* `prateeks16.in`, add it to
`EXTRA_ALLOWED_ORIGINS` on Render as a comma-separated list instead of editing code.

---

## First deploy

### Backend (Render)

1. Push the branch. Render runs `backend/build.sh`, which installs dependencies,
   collects static files, and applies migrations — including the new `crm` tables.
2. Set environment variables in the Render dashboard:

   | Variable | Needed | Purpose |
   |---|---|---|
   | `SECRET_KEY` | yes | already set |
   | `DATABASE_URL` | yes | already set |
   | `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET` | yes | Cloudinary, already set |
   | `PORTFOLIO_URL` | recommended | `https://prateeks16.in` |
   | `EXTRA_ALLOWED_ORIGINS` | optional | extra origins, comma separated |
   | `CRM_INGEST_TOKEN` | for the job scan | long random string; unset closes ingest |
   | `EMAIL_HOST_USER` | for mail, both ways | Gmail address |
   | `EMAIL_HOST_PASSWORD` | for mail, both ways | Gmail **App Password** |
   | `DEFAULT_FROM_EMAIL` | optional | defaults to `EMAIL_HOST_USER` |
   | `DEFAULT_FROM_NAME` | recommended | display name recipients see; without it they get a bare address |
   | `REPLY_TO_EMAIL` | optional | only if replies should go somewhere other than the sending mailbox |
   | `IMAP_HOST` `IMAP_PORT` | optional | default `imap.gmail.com` / `993` |
   | `IMAP_FOLDER` | optional | default `INBOX` |
   | `IMAP_SYNC_DAYS` | optional | how far back each sync looks, default `14` |
   | `IMAP_MAX_MESSAGES` | optional | ceiling per run, default `80` |
   | `EMAIL_BACKEND` | **required on Render** | `crm.gmail_api.GmailAPIBackend` — see [Sending where SMTP is blocked](#sending-where-smtp-is-blocked) |
   | `GMAIL_CLIENT_ID` | with that backend | OAuth client ID |
   | `GMAIL_CLIENT_SECRET` | with that backend | OAuth client secret |
   | `GMAIL_REFRESH_TOKEN` | with that backend | from `manage.py gmail_authorize` |

   One Gmail App Password covers receiving, and sending too on any host that
   permits outbound SMTP. **Render does not** — the four `GMAIL_*` variables are
   what make sending work there. Environment changes need a restart or redeploy
   to reach a running instance.

3. Create your dashboard login **without a shell** — Render's shell is a paid
   feature, so `build.sh` does this for you on every deploy.

   Add two environment variables in the Render dashboard, then redeploy:

   | Variable | Value |
   |---|---|
   | `CRM_ADMIN_USERNAME` | the username you want |
   | `CRM_ADMIN_PASSWORD` | a strong password you choose |

   The build runs `python manage.py bootstrap_crm`, which creates the account and
   seeds the six outreach templates. Everything it does is `get_or_create`, so it
   is safe on every deploy and never overwrites your edits.

   Once the account exists you can delete `CRM_ADMIN_PASSWORD` from the
   environment. Setting it again later and redeploying is also how you reset a
   forgotten password.

### Frontend (Vercel)

Root directory is `frontend/`. Build command `npm run build`, output `dist`.

`npm run build` runs `scripts/snapshot.mjs` first, which fetches your live content and
bakes it into the bundle (see below). If the API is unreachable at build time the
previous snapshot is kept and the build still succeeds.

Optional: set `VITE_API_BASE_URL` if the backend URL ever changes. It defaults to the
current Render URL.

Every section of the portfolio is a real path — `/work`, `/about`, `/experience`,
`/achievements`, `/contact` — rather than a `#` fragment, so they can be linked and
indexed. They are still one page; routing happens in the browser. This depends on
`frontend/vercel.json` rewriting every path to `index.html`. Any host you move to
needs the same SPA fallback, or those URLs will 404 on a hard refresh.

---

## The Render cold-start problem

Render's free tier sleeps a service after about 15 minutes without traffic, and the
next request then pays a cold start of roughly a minute. Three separate mechanisms
now address it, and they are independent — if one is off, the others still work.

**1. Build-time content snapshot.** `frontend/scripts/snapshot.mjs` pulls your
profile, projects, experience and achievements at build time into
`src/data/snapshot.json`, which is imported synchronously. The portfolio therefore
paints complete, real content on first frame with no network request at all. A cold
backend is invisible to visitors.

**2. Cache, then revalidate.** After first paint the browser fetches fresh content in
the background and stores it in `localStorage`. Repeat visitors see whatever the CRM
last returned — newer than the snapshot if you have edited content since deploying.

**3. Keep-warm cron.** `.github/workflows/keep-warm.yml` pings
`/api/crm/health/` every 10 minutes so the instance never sleeps. The endpoint does no
database work. This is what keeps the *dashboard* and the *contact form* fast, since
those genuinely need a live backend.

To enable the cron: it runs automatically once the workflow file is on the default
branch. Set repository variable `BACKEND_URL` if your backend URL differs from the
default. GitHub may disable scheduled workflows on repositories with no activity for
60 days — re-enable from the Actions tab if that happens.

> Free-tier note: Render gives 750 instance-hours per month, and a month is about 730
> hours. One always-on free service fits. A second one will not.

If you later want to leave Render entirely, the backend is a plain Django app with a
`DATABASE_URL` — Fly.io and Railway both run it without code changes.

---

## Feeding the weekday job scan into the CRM

The Cowork scheduled task *Weekday internship scan — SDE + AI/ML* runs Mon–Fri at
09:00 IST in a cloud sandbox. Each run starts a fresh session with no memory, so it
cannot hold a login. It posts to a single-purpose endpoint instead:

```
POST /api/crm/ingest/opportunities/
X-Ingest-Token: <CRM_INGEST_TOKEN>

{"items": [
  {"company": "Acme", "role": "Backend Engineer (New Grad 2027)",
   "apply_url": "https://...", "location": "Remote",
   "stack": ["Go", "Postgres"], "stage": "Lead",
   "posted_at": "2026-08-18", "deadline": "2026-09-05T09:00:00Z"}
]}
```

Why a separate token rather than a JWT: this endpoint can only create or update
job-scan leads. It cannot read your pipeline, send mail, or change anything on the
public site, so a token sitting in a task prompt is a much smaller blast radius than
a login would be. Leave `CRM_INGEST_TOKEN` unset and ingest is closed entirely.

Two behaviours worth knowing:

- Rows match on **(company, role)**, so the same posting seen on five consecutive
  mornings updates one card instead of creating five.
- A lead already at Contacted, Applied, Replied, Interviewing, Offer, Won or Lost
  **keeps its stage**. The scan reports postings; it never drags your progress
  backwards.

Scanned postings land on the Leads board with source *Automated job scan*, an
external link to the posting, and the stack as tags — which is what feeds the
Stack demand chart under Leads → Insights.

---

## Turning on email, both directions

Mail is deliberately off until credentials exist. Until then the CRM drafts, stores
and edits everything, and both the send and sync endpoints refuse with an explicit
message rather than failing silently. Nothing can leave your account by accident.

**To enable it.** Turn on 2-Step Verification (Google Account → Security), create an
App Password under the same page, then set `EMAIL_HOST_USER` and
`EMAIL_HOST_PASSWORD` on Render and redeploy. That switches on receiving, and
switches on sending too anywhere outbound SMTP is allowed. On Render it is not, so
sending needs the extra step in [Sending where SMTP is blocked](#sending-where-smtp-is-blocked).
Settings in the dashboard shows live status.

You do *not* need to enable IMAP in Gmail. Google removed that toggle in January 2025
and IMAP is always on for personal accounts — if Settings → Forwarding and POP/IMAP
shows no status line under *IMAP access*, that is what you are looking at. Leave POP
disabled; it is not used and enabling it can disturb read state.

Treat the App Password like a key — anyone holding it can send mail as you.

### What each direction does

**Sending** is performed by Gmail itself, which is why sent mail appears in your Gmail
**Sent** folder like anything else from that address. A third-party sender (SendGrid,
Resend, a Firebase extension) would not — Gmail never sees those, so Sent stays empty.
That is the reason for this design, not an accident of it.

There are two transports, and Gmail does the sending under both:

- **SMTP** (`smtp.gmail.com`, the default) — for any host that allows outbound SMTP.
- **The Gmail API** over HTTPS — for hosts that do not. Render is one. Same account,
  same Sent folder, port 443 instead of 587.

Which one is in use is a single environment variable and nothing above it changes:
the same message, the same `Message-ID`, the same threading headers, the same
behaviour on failure.

**Threading.** Every outgoing message is stamped with a `Message-ID`, and replies
carry `In-Reply-To` and `References` so Gmail files them in the existing conversation
on both sides.

One wrinkle worth knowing about: **Gmail does not keep the `Message-ID` you give it.**
It overwrites the header with one of its own — over SMTP just as much as over the API.
So the id minted locally before a send is not what the recipient sees, and not what
their client quotes when they reply. Storing the local value would mean every reply
fails to match the email it answers.

The fix is one metadata-only read after each send, asking Gmail which id it actually
wrote, and storing that. This is the only reason `gmail.metadata` is requested. If
that read fails — a token minted before the scope was added returns 403 — the send
still succeeds and matching falls back to the sender's address, which links the reply
to the right **lead** but not to the specific email. Re-mint the token to fix it.

**Receiving** pulls over IMAP into the CRM's Mail screen. Gmail stays the system of
record: the mailbox is opened read-only and fetched with `BODY.PEEK`, so a sync
cannot mark anything read, move it, or delete it. The read and archived flags on the
Mail screen belong to the CRM alone — archiving there leaves the Gmail thread
untouched.

Messages are keyed on `Message-ID`, so re-syncing an overlapping window is
idempotent. That is the recovery path after the backend has slept through a
delivery: sync a wider window, nothing duplicates.

A reply that matches something you sent stamps `replied_at` on the lead and moves it
to *Replied* — but only from New, Contacted or Applied. An answer never drags a lead
backwards out of Interviewing, Offer, Won or Lost.

### Contact-form messages

A form submission is stored and shown in the dashboard **Inbox** regardless of mail
settings. Once credentials exist it is also forwarded into the mailbox as real email,
subject-prefixed `[Portfolio]`, so it turns up in Gmail where you will actually see
it. `Reply-To` is set to whoever wrote in, so pressing Reply in Gmail answers *them*,
not yourself.

It is sent on a background thread and never raises: the submission is saved first,
and a visitor must not see the form fail because a notification could not go out. If
mail is unconfigured or the transport is down, the message is still in the Inbox.

The IMAP sync skips messages sent from your own address, so these notifications do
not come back round as duplicates on the Mail screen.

### Keeping the inbox current

The Mail screen syncs itself when you open it and the last run is more than three
minutes old, which covers ordinary use. For mail to arrive without anyone opening the
dashboard, run the management command on a schedule:

```
python manage.py sync_mailbox            # uses IMAP_SYNC_DAYS
python manage.py sync_mailbox --days 30  # wider window after an outage
```

Safe to run as often as you like. Overlapping windows cost a little bandwidth and
change nothing.

### Sending where SMTP is blocked

Render blocks outbound SMTP. This is not a guess — from the live server, on both
587 and 465:

```
OSError: [Errno 101] Network is unreachable
```

That is `ENETUNREACH` at the socket layer: the TCP connection never opens, before
any handshake or credential is exchanged. IMAP on 993 works from the same host, so
it is port-specific egress filtering. **No code, credential or port setting fixes
it.** Receiving works on Render; sending over SMTP cannot.

The fix is to send over HTTPS instead, through the Gmail API. Gmail still performs
the send, so the Sent folder still fills. Setup is once, and about fifteen minutes.

**1. Google Cloud project.** At [console.cloud.google.com](https://console.cloud.google.com),
create a project (any name). Under *APIs & Services → Library*, find **Gmail API**
and enable it.

**2. OAuth consent screen.** *APIs & Services → OAuth consent screen*. User type
**External**. Fill in app name and your own address for both support and developer
contact. Add exactly two scopes:

- `https://www.googleapis.com/auth/gmail.send` — the send itself
- `https://www.googleapis.com/auth/gmail.metadata` — headers only, read-only, used
  once per send to read back the Message-ID Gmail wrote (see *Threading* below)

Not `gmail.readonly` and not `gmail.modify`. Neither is needed: IMAP does the reading
with the App Password, and keeping them off means a leaked refresh token can send but
never read your mail.

Add the sending account — the same address as `EMAIL_HOST_USER`, not your personal
one — as a **test user**.

> Leaving the app in **Testing** status expires the refresh token after **7 days**,
> and sending starts failing with `invalid_grant`. Press **Publish app** to move it
> to *In production* and the token stops expiring. Google will show an
> "unverified app" warning during authorization, which for a personal client on your
> own account is expected — choose *Advanced*, then *Go to … (unsafe)*.

**3. OAuth client.** *APIs & Services → Credentials → Create credentials → OAuth
client ID*. Application type **Desktop app**. Copy the client ID and secret.

**4. Mint the refresh token — locally, not on Render.** The flow needs a browser:

```
cd backend
.venv/Scripts/python manage.py gmail_authorize --client-id XXX --client-secret YYY
```

It opens Google, waits for the redirect on `http://localhost:8765`, and prints the
four environment variables to set. The token is printed and never written to disk —
it can send mail as you, so treat it like the App Password. Use `--port` if 8765 is
taken, and `--no-browser` on a headless shell.

**5. Set them on Render** and redeploy:

```
EMAIL_BACKEND=crm.gmail_api.GmailAPIBackend
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
```

Leave `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` exactly as they are. IMAP
receiving still uses the App Password, and the contact-form notification still sends
from that address.

To go back to SMTP on a host that permits it, remove `EMAIL_BACKEND`. The SMTP path
is untouched and remains the default.

### When it will not connect

| Message | Cause |
|---|---|
| `[AUTHENTICATIONFAILED] Invalid credentials` | App Password wrong, spaces not stripped, or the account password used instead |
| `[ALERT] Please log in via your web browser` | Same — Gmail refuses account passwords over IMAP |
| timeout, `getaddrinfo failed` | Port 993 blocked by the network |
| `Fetched 0` | Auth is fine, the window is just quiet — widen `--days` |
| `[Errno 101] Network is unreachable` on send | The host blocks outbound SMTP — switch `EMAIL_BACKEND` to the Gmail API |
| `Token has been expired or revoked (invalid_grant)` | Refresh token dead. Usually the 7-day Testing-status expiry; publish the app, then re-run `gmail_authorize` |
| `Gmail API sending is selected but not configured` | `EMAIL_BACKEND` points at the Gmail backend but a `GMAIL_*` variable is missing |
| `Request had insufficient authentication scopes` | Token predates the `gmail.metadata` scope. Sending still works; only the Message-ID read-back is skipped. Add the scope on the consent screen, then re-run `gmail_authorize` |

---

## Local development

```
# backend
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt        # Windows
DEBUG=True CLOUD_NAME=dnkzf5hvi .venv/Scripts/python manage.py migrate
DEBUG=True CLOUD_NAME=dnkzf5hvi .venv/Scripts/python manage.py bootstrap_crm \
    --username prateek --password 'local-password' --pull-live
DEBUG=True CLOUD_NAME=dnkzf5hvi .venv/Scripts/python manage.py runserver 8000
```

`CLOUD_NAME` is required locally because media fields are stored on Cloudinary and
serializing them without it raises. `--pull-live` copies production content into your
local database so the site has real data to render.

```
# frontend
cd frontend
npm install
echo "VITE_API_BASE_URL=http://127.0.0.1:8000" > .env.local
npm run dev
```

Dashboard is at `/dashboard`, portfolio at `/`.

---

## API reference

Public, no auth:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/profile/` `/api/projects/` `/api/experiences/` `/api/achievements/` | portfolio content |
| POST | `/api/contact/` | portfolio contact form → dashboard **Inbox** (distinct from **Mail**, which is real Gmail) |
| POST | `/api/crm/track/` | analytics beacon |
| GET | `/api/crm/health/` | keep-warm ping |

Authenticated with `Authorization: Bearer <token>` from `/api/crm/auth/token/`:

| Path | Purpose |
|---|---|
| `/api/crm/summary/` | everything the Overview needs, one request |
| `/api/crm/leads/` | CRUD, plus `/{id}/note/` and `/pipeline/` |
| `/api/crm/emails/` | CRUD, plus `/draft/`, `/{id}/send/`, `/mail_status/` |
| `/api/crm/templates/` | CRUD, plus `/{id}/preview/` |
| `/api/crm/tasks/` `/api/crm/inbox/` | CRUD; inbox has `/{id}/convert/` |
| `/api/crm/mail/` | inbound Gmail, read-only; `/sync/`, `/sync_status/`, and per message `/{id}/reply/`, `/{id}/read/`, `/{id}/archive/`, `/{id}/convert/` |
| `/api/crm/analytics/?days=30` | traffic rollup |
| `/api/crm/github/` | live repo stats |
| `/api/crm/manage/*` | write access to public content |
