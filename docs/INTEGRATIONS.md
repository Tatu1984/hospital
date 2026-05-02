# External Service Integrations — Client Provisioning Guide

The HMS application runs on **Vercel** (compute) + **NeonDB** (Postgres). Both
of those are paid for under the deployment account. Everything below is a
*separate* third-party account the hospital will need to sign up for and pay
for directly.

This doc is the source of truth for the client conversation: which services
are required for go-live, which are optional, and roughly what each costs at
small-hospital scale.

---

## TL;DR — minimum to go live

| Service | Purpose | Suggested vendor (India) | Order of magnitude / month |
|---|---|---|---|
| **Email** | Password reset, invoices, lab reports | SendGrid / AWS SES / Hostinger SMTP | ₹0–₹2,000 |
| **SMS** | Appointment reminders, OTPs | MSG91 / Gupshup | ₹0.15–₹0.30 per SMS |
| **Payment gateway** | Online billing | Razorpay | 2% per transaction |
| **Sentry** *(strongly recommended)* | Error tracking + on-call alerts | sentry.io | $0 free / $26+ paid |

**Three required services. One strongly recommended. Everything else is
phase-2.**

---

## Full integration matrix

### 1. Email — REQUIRED

**Used for:** password reset links, invoice PDFs, lab/radiology report
delivery, system alerts.

**Current state:** Notification service abstraction exists at
`backend/src/services/notification.ts` with provider switches for `smtp`,
`sendgrid`, `aws-ses`, `mock`. The actual SDK calls are not yet wired — the
service drops to the `mock` provider until the env is configured. **The
client's first integration job is to pick a provider and ship the SDK call.**

**Vendors (any one):**

| Vendor | Best for | Pricing (India) |
|---|---|---|
| SendGrid | Highest deliverability, easy setup | Free 100/day, then ~$20/mo |
| AWS SES | Cheap at scale, AWS-native | $0.10 per 1,000 emails |
| Hostinger SMTP / Zoho ZeptoMail | Bundled with hosting | ~₹500/mo |
| Mailgun | Mid-volume, good API | $35/mo for 50k |

**Env vars:** `EMAIL_PROVIDER`, `EMAIL_FROM`, plus provider-specific:
`SENDGRID_API_KEY` *or* `SMTP_HOST/PORT/USER/PASS`.

---

### 2. SMS — REQUIRED

**Used for:** appointment reminders, OTP for password reset (when wired),
critical alerts (lab panic values, blood request urgency), follow-up nudges.

**Current state:** Same service abstraction as email. Provider switch in
place; SDK calls not wired. India-specific: SMS regulations require a
DLT-registered sender ID + template approval before bulk SMS works. The
client (or the SMS vendor) handles DLT registration — **we cannot do it on
their behalf**.

**Vendors (any one):**

| Vendor | Pricing | Notes |
|---|---|---|
| MSG91 | ₹0.15–₹0.30 per SMS | Most common Indian provider, includes DLT helper |
| Twilio | ~₹0.60 per SMS | Global, more expensive in India |
| Gupshup | ₹0.13–₹0.25 per SMS | India-native, also does WhatsApp |
| AWS SNS | ~$0.01 per SMS | Use only if already on AWS |

**Env vars:** `SMS_PROVIDER`, `SMS_SENDER_ID`, `SMS_API_KEY`,
`SMS_API_SECRET`.

**Heads-up for client:** DLT registration takes 7–10 business days. **Start
this before signing the launch date** so it doesn't become the gating item.

---

### 3. WhatsApp — OPTIONAL but recommended

**Used for:** appointment reminders (preferred over SMS by patients),
invoice/discharge summary delivery, follow-up nudges.

**Current state:** Provider switch slot exists; no implementation.

**Vendors (any one):**

| Vendor | Pricing | Notes |
|---|---|---|
| Gupshup | Per-conversation: ~₹0.39 | India-native, easy onboarding |
| Twilio WhatsApp | ~$0.005 per message | Same Twilio account as SMS |
| Interakt | ₹0.50 per conversation | Good UX, includes inbox |
| Meta Cloud API | Cheapest, free tier | Direct, more setup overhead |

**Heads-up:** WhatsApp Business API requires a Meta Business Manager account,
phone number verification, and template approval. Allow 5–7 business days.

**Env vars:** `WHATSAPP_PROVIDER`, `WHATSAPP_API_KEY`,
`WHATSAPP_FROM_NUMBER`.

---

### 4. Payment gateway — REQUIRED for online billing

**Used for:** online invoice payments, IPD admission deposits, refunds.

**Current state:** **Not implemented.** Invoices and payments are recorded
manually in the DB. The UI accepts cash/card/UPI mode but doesn't actually
charge a card.

**Recommended:** **Razorpay.** Indian-default, KYC takes 2–3 days, supports
UPI/cards/netbanking out of the box.

**Pricing (Razorpay):** 2% per transaction (UPI is sometimes 0% promotional);
₹0 setup; ₹3,000+GST/yr business plan recommended for refund support.

**Implementation work this requires (estimate: ~3 days backend + 2 days frontend):**
- Add `POST /api/payments/order` to create a Razorpay order from an invoice
- Add `POST /api/payments/verify` webhook to confirm payment + update invoice
- Wire the frontend Razorpay checkout modal into `BillingPage.tsx`
- Add refund flow

**Env vars (when implemented):** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`.

---

### 5. Sentry — OPTIONAL (strongly recommended)

**Used for:** uncaught exceptions on backend + frontend, performance traces,
release tagging, on-call alerts.

**Current state:** **Wired and ready.** Set `SENTRY_DSN` and it goes live.
Source maps upload to Sentry from CI on every main-branch deploy. Release is
tagged with the git SHA automatically.

**Pricing:** Free tier covers 5k errors / 10k transactions per month — enough
for a single hospital. The Team plan is $26/mo for 50k events.

**Env vars:** `SENTRY_DSN` (the only required one). Optionally
`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` as GitHub secrets if you
want CI to upload source maps for stack-trace symbolication.

---

### 6. Redis — OPTIONAL

**Used for:** distributed rate limiting (otherwise per-pod, resets on Vercel
cold start).

**Current state:** Wired with in-memory fallback. Set `REDIS_URL` to enable.

**Recommended (free):** Upstash Redis — has a Vercel integration, free tier
of 10k commands/day. Paid tier $0.2/100k commands.

**When to bother:** Once you're running >2 Vercel instances under sustained
load, or once you start getting "rate limit too lenient" reports because
limits are per-pod.

---

### 7. PACS / DICOM server — OPTIONAL (required only if Radiology launches)

**Used for:** storing and viewing X-ray, CT, MRI images. The Radiology page
in the UI assumes there's an Orthanc-style PACS to fetch from.

**Current state:** UI route exists; backend not wired.

**Vendors:**

| Option | Pricing | Notes |
|---|---|---|
| **Self-hosted Orthanc** | Free (compute only) | Open source, run on a small VM |
| **dcm4chee** | Free | More enterprise-y, heavier |
| **AWS HealthImaging** | $0.30/GB/mo storage | Managed, FHIR-friendly |

**Recommended path:** Self-hosted Orthanc on a small Hetzner / DigitalOcean
box (~₹500/mo). Implementation is an afternoon — Orthanc has a clean REST
API.

**Env vars (when implemented):** `PACS_BASE_URL`, `PACS_USERNAME`,
`PACS_PASSWORD`.

---

### 8. Object storage — OPTIONAL

**Used for:** lab report PDFs, radiology image previews, patient photos,
discharge summary PDFs.

**Current state:** Local `./uploads` directory (won't work on Vercel —
serverless filesystem is read-only). **Required if any upload feature is
turned on in production.**

**Vendors:**

| Vendor | Pricing | Notes |
|---|---|---|
| **Cloudflare R2** | $0.015/GB/mo, free egress | Cheapest if you serve images publicly |
| AWS S3 | $0.023/GB/mo | Industry default |
| Supabase Storage | Free 1GB / $0.021/GB | Good if you ever add a Supabase tier |

**Recommended:** Cloudflare R2.

**Env vars:** `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` (for R2).

---

### 9. Video consult — OPTIONAL

**Used for:** doctor-patient telemedicine.

**Current state:** UI route exists at `/video-conversation`; backend not
implemented.

**Vendors:**

| Vendor | Pricing | Notes |
|---|---|---|
| **Daily.co** | $0.004/participant-min | Best DX, easy to wire |
| Twilio Video | ~$0.0015/participant-min | Cheaper at scale |
| Agora | Similar to Twilio | Big in Asia |

**Skip until there's confirmed doctor demand.**

---

### 10. Tally / accounting sync — OPTIONAL (phase 2)

**Used for:** sync chart-of-accounts and journal entries from HMS into
Tally for the hospital's CA / accountant.

**Current state:** API endpoints exist as mock data only. **Not implemented.**

**What's needed:** A Tally connector running on a Windows machine on the
hospital's local network (Tally only runs on Windows). It exposes an HTTP
endpoint the HMS can hit. Setup is 1 day on-premise; the hospital's existing
IT vendor usually handles this.

---

### 11. Biometric attendance — OPTIONAL (phase 2)

**Used for:** staff fingerprint/face attendance.

**Current state:** UI route exists; backend mocked.

**Hardware:** Zkteco / Mantra / Realtime fingerprint scanner (₹3k–₹15k
hardware, one-time). The device pushes attendance to a local URL — needs a
small connector daemon on the hospital LAN.

---

## Domain & DNS

The HMS lives on a `*.vercel.app` URL by default. **The client should buy a
domain** (e.g. `hms.theirhospital.com`) and point it at Vercel. ~₹800/yr.

---

## Recommended phasing

**Pre-launch (first 2 weeks):**
1. Email (SendGrid) — needed for password reset to actually deliver
2. SMS (MSG91) — start DLT registration immediately, it's the long pole
3. Sentry — free tier, 5-minute setup, gives the team observability from day 1
4. Domain — DNS propagation takes a day

**Launch month:**
5. Razorpay — KYC takes a few days; not blocking go-live if cash/card-at-
   counter is acceptable initially
6. Redis (Upstash free tier) — once traffic justifies it
7. WhatsApp — patient-facing nice-to-have

**Phase 2 (post-launch):**
8. PACS / object storage / video consult / Tally / biometric — only as the
   relevant module gets turned on
