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
   | `EMAIL_HOST_USER` | only to send mail | Gmail address |
   | `EMAIL_HOST_PASSWORD` | only to send mail | Gmail **App Password** |
   | `DEFAULT_FROM_EMAIL` | optional | defaults to `EMAIL_HOST_USER` |

3. Create your dashboard login. In the Render shell:

   ```
   python manage.py bootstrap_crm --username prateek --password 'a-strong-password'
   ```

   This also seeds the six outreach templates. It is safe to re-run: everything is
   `get_or_create`, so it never overwrites edits.

### Frontend (Vercel)

Root directory is `frontend/`. Build command `npm run build`, output `dist`.

`npm run build` runs `scripts/snapshot.mjs` first, which fetches your live content and
bakes it into the bundle (see below). If the API is unreachable at build time the
previous snapshot is kept and the build still succeeds.

Optional: set `VITE_API_BASE_URL` if the backend URL ever changes. It defaults to the
current Render URL.

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

## Turning on email sending

Sending is deliberately off until credentials exist. Until then the CRM drafts,
stores and edits everything, and the send endpoint refuses with an explicit message
rather than failing silently. Nothing can leave your account by accident.

To enable it: create a Google App Password (Google Account → Security → 2-Step
Verification → App passwords), then set `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD`
on Render and redeploy. Settings in the dashboard shows live status.

Treat the App Password like a key — anyone holding it can send mail as you.

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
| POST | `/api/contact/` | contact form → CRM inbox |
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
| `/api/crm/analytics/?days=30` | traffic rollup |
| `/api/crm/github/` | live repo stats |
| `/api/crm/manage/*` | write access to public content |
