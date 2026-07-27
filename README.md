# Gen AI Live

The platform behind the live sessions. Sessions themselves run on Google Meet or Zoom;
everything around them — discovery, intake, payment, scheduling, materials, the instructor's
console — lives here.

## What it does

| Offering | Price | Format | Cadence |
| --- | --- | --- | --- |
| 30-minute consultation | ₹499 (list ₹1,000) | One-on-one, live | Weekend slots, on demand |
| Applied Gen AI Research: RAG & Agent Development | ₹24,999 (list ₹50,000) | 10 live hours, 5 sessions, highly technical | New cohort every 45 days |
| Step Up to the Gen AI Ecosystem | ₹14,999 (list ₹30,000) | 15 live hours, 10 sessions, low jargon | New batch every 30 days |

Prices live in the database (`Program.priceInPaise`), not in the code. Change them there and
every page follows.

**Learner flow.** Pick a weekend slot or a cohort → fill the intake form → pay through Razorpay
(UPI, card, netbanking) → land on a confirmation page carrying a reference, the joining link, an
`.ics` calendar file and any unlocked downloads.

**Instructor flow.** `/admin` — sign in, open more weekend slots, set the meeting room, read the
intake notes before a session, work the roster, record attendance and private notes.

## Running it locally

Requires Node 20+ and PostgreSQL 14+.

```bash
npm install
cp .env.example .env          # then fill it in — see below
npx prisma migrate dev        # creates the schema
npm run db:seed               # programmes, one cohort each, weekend slots, downloads
npm run dev
```

The site is on http://localhost:3000 and the console on http://localhost:3000/admin.

### Environment

| Variable | Needed for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | everything | Postgres connection string |
| `NEXT_PUBLIC_SITE_URL` | absolute links, metadata | e.g. `https://genailive.in` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | taking payment | Dashboard → Settings → API Keys |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | the checkout window | Same key id; safe in the browser |
| `RAZORPAY_WEBHOOK_SECRET` | confirming payment | Dashboard → Settings → Webhooks |
| `ADMIN_PASSWORD` | `/admin` | Long and random |
| `ADMIN_SESSION_SECRET` | `/admin` | Any long random string; signs the session cookie |
| `NEXT_PUBLIC_INSTAGRAM_URL` | footer, contact | |
| `NEXT_PUBLIC_LINKEDIN_URL` | footer, contact | |
| `NEXT_PUBLIC_CONTACT_EMAIL` | footer, legal pages | |

Without the Razorpay keys the site runs fine — booking and enrolment return a clear "payments are
not configured yet" instead of failing obscurely.

## Razorpay

Two independent confirmation paths, both idempotent, because either one alone loses money or
learners:

1. **Checkout callback** — the browser posts the signed response to `/api/payments/verify`. The
   signature is re-checked server-side. This exists so the learner sees their confirmation
   immediately.
2. **Webhook** — `POST /api/webhooks/razorpay`, verified against the raw request body. This is the
   authoritative record: it lands even if the learner closes the tab mid-redirect.

Set the webhook up in Dashboard → Settings → Webhooks:

- URL: `https://<your-domain>/api/webhooks/razorpay`
- Secret: whatever you put in `RAZORPAY_WEBHOOK_SECRET`
- Events: `payment.captured` and `payment.failed`

Razorpay retries any non-2xx, so the handler dedupes on the delivery id (`WebhookEvent`) and
returns 200 for anything it deliberately ignores. Genuine faults return 500 so the retry is useful.

Razorpay's merchant verification asks for public terms, privacy, refund and contact pages. They are
at `/terms`, `/privacy`, `/refunds` and `/contact` — written for this business, but have them
reviewed against your registered entity before you submit.

## Not wired up yet: transactional email

There is no mailer. Everything a learner needs is on the confirmation page — reference, joining
link, calendar file, downloads — and that page is the source of truth, but several places in the
copy promise a confirmation *email* that nothing currently sends
(`src/app/confirmation/[reference]/page.tsx`, `/terms`, the download unlock hint).

Closing this needs a provider decision (Resend, SES, Postmark, plain SMTP) and credentials. The
hook points are already in the right place: `confirmPayment()` in `src/lib/payments.ts` is the
single moment a booking or enrolment becomes real, so one call from there covers both flows.

Until it is wired, either send confirmations by hand from **Admin → Consultations** (every address
is there) or soften the copy in those three places.

## How scheduling works

The instructor only takes one-on-ones at weekends, so the weekend is banded to stop double-booking:

- **Morning** — research cohort sessions (10:00–12:00 IST)
- **Afternoon** — ecosystem batch sessions (14:00–15:30 IST)
- **Evening** — 30-minute consultations (17:00–20:00 IST, `DEFAULT_SLOT_TIMES`)

Slots are stored as UTC instants and always displayed in IST with the label attached. Generate more
from **Admin → Availability**; re-running only fills gaps, so it is safe to press twice.

Booking a slot moves it to `HELD` through a conditional update, so two people clicking the same
slot at the same moment cannot both get it. A hold lapses after 15 minutes, and abandoned holds are
swept whenever availability is read — no cron job needed.

Cohort seats are counted against **confirmed** enrolments only, so an abandoned checkout never
silently shrinks a cohort.

## Downloads

Files live in `public/downloads` and are described by the `Resource` table, in three tiers:

- `PUBLIC` — released for an email address, which is captured as a lead
- `CONSULTATION` — needs a `CON-` reference plus the email it was booked with
- `ENROLLED` — needs an `ENR-` reference for a confirmed enrolment in that programme

The PDFs are generated from source, so the syllabus is reviewable in a diff:

```bash
node scripts/generate-downloads.mjs
```

Edit the content in `scripts/generate-downloads.mjs` and re-run. To serve a file from object
storage instead, point `Resource.fileUrl` at the absolute URL — nothing else changes.

## Testing

```bash
npm run dev                    # in one shell
node scripts/smoke-test.mjs    # in another
```

55 checks over the paths that hurt when they break: form validation, slot concurrency, payment
confirmation and idempotency, webhook signature verification, replay dedupe, download entitlement,
calendar output, admin lockout, and expired-hold sweeping. It cleans up after itself.

Screenshots of every public page at desktop and mobile width:

```bash
node scripts/screenshot.mjs    # writes to /tmp/shots
```

## Deploying

Any host that runs Next.js 15 with a Postgres database. On Vercel:

1. Set every environment variable from the table above.
2. Build command `npm run build` (it runs `prisma generate` first).
3. Run `npx prisma migrate deploy` against the production database before the first release and on
   any schema change.
4. Seed once — `npm run db:seed` — to create the programmes, then manage everything from `/admin`.
5. Point the Razorpay webhook at the deployed URL.

Rate limiting is in-process and resets on deploy. It is there to blunt a bot on the booking form,
not as a security boundary — if the site ever runs on more than one instance, move
`src/lib/rate-limit.ts` to Redis.

## Layout

```
prisma/           schema, migrations, seed
public/downloads/ generated PDFs
scripts/          PDF generation, smoke test, screenshots
src/app/          routes — public pages, /admin, /api
src/components/   shared UI (forms, slot picker, header, footer)
src/lib/          db, razorpay, payments, slots, entitlements, validation, formatting
```

Two things worth knowing before changing them:

- `src/lib/format.ts` composes dates from explicit parts rather than using
  `Intl.DateTimeFormat`. Node and browsers disagree on the pattern ("Saturday 1 August" vs
  "Saturday, 1 August"), which React reports as a hydration mismatch.
- `src/lib/payments.ts` is the only place booking, enrolment and slot state change on payment.
  Both confirmation paths funnel through it so they cannot drift.
