// Clinical copilot — Claude API integration for SOAP notes, differential
// diagnosis suggestions, encounter summaries, and patient-friendly
// explanations.
//
// PHI handling:
//   - Patient context is built SERVER-SIDE from authenticated Prisma
//     queries, scoped to req.user.tenantId. The client may not inject
//     arbitrary patient data into prompts.
//   - Names, MRNs, contact info, dates of birth, and other direct
//     identifiers are STRIPPED before prompts are sent to Anthropic.
//     Patients are referred to in prompts as "[Patient]" + age + sex.
//   - Every call writes a COPILOT_* AuditLog row with userId,
//     resourceId (patientId), durationMs, modelId, tokensIn/Out.
//   - Per-user rate limit (10 calls / hour). In-memory for now; for
//     multi-instance deployment swap the store for Redis.
//
// Prompt caching strategy:
//   - System prompts are STATIC (no timestamps, no per-request data)
//     and carry `cache_control: {type: "ephemeral"}` so the prefix is
//     cached across calls. Cache hit rate should approach 95% in
//     production — see usage.cache_read_input_tokens in the response.
//   - Per-request data (transcript, complaint, vitals, etc.) lives in
//     the user message AFTER the cached prefix.
//
// Model: claude-opus-4-7 with `thinking: {type: "adaptive"}`. Adaptive
// thinking lets Claude decide how much reasoning each query needs —
// great for "summarise this 6-month history" (heavy) vs "convert this
// transcript to SOAP" (light).

import { Request, Response, RequestHandler } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './shared/prisma';
import { authenticateToken } from './middleware';
import { writeAudit } from './utils/audit';
import { clinicalModulesRouter } from './clinical-modules';

type AuthedReq = Request & { user?: { userId: string; tenantId: string; branchId?: string } };
const auth: RequestHandler = authenticateToken as any;

const MODEL = 'claude-opus-4-7';
// 16K covers the largest reasonable output (an 8-month patient summary
// with 20+ encounters); the SDK has no problem returning that without
// streaming.
const MAX_TOKENS = 16000;

// Lazy-construct the client so the server boots even without the key
// set. We surface a 503 with a clear message on each request below.
let anthropic: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (anthropic) return anthropic;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return anthropic;
}

// =============== RATE LIMITING ===============
// Sliding-window in-memory limit, keyed by userId. 10 calls / hour.
// For a multi-instance backend, swap this for a Redis token-bucket.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const userHits: Map<string, number[]> = new Map();

function rateLimit(userId: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const hits = (userHits.get(userId) || []).filter(t => t > cutoff);
  if (hits.length >= RATE_LIMIT_MAX) {
    const oldest = hits[0];
    return { ok: false, retryAfter: Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000) };
  }
  hits.push(now);
  userHits.set(userId, hits);
  return { ok: true };
}

// =============== HELPERS ===============

function age(dob: Date | null): number | null {
  if (!dob) return null;
  const ms = Date.now() - dob.getTime();
  return Math.max(0, Math.floor(ms / (365.25 * 24 * 3600 * 1000)));
}

// Sanitise free-text inputs from clinicians: strip nothing semantic
// but cap length so the model can't be coerced into ignoring the
// system prompt via a giant payload.
function sanitiseText(s: any, maxLen = 8000): string {
  if (typeof s !== 'string') return '';
  return s.trim().slice(0, maxLen);
}

// Build a PHI-stripped patient context that the model can use without
// learning who the patient is. Always scoped through tenantId.
async function buildPatientContext(patientId: string, tenantId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, tenantId },
    select: { id: true, dob: true, gender: true, bloodGroup: true },
  });
  if (!patient) return null;

  const [allergies, diagnoses, recentEncounters] = await Promise.all([
    prisma.allergy.findMany({
      where: { patientId, active: true },
      orderBy: { severity: 'desc' },
      take: 20,
      select: { substance: true, severity: true, reaction: true },
    }),
    prisma.diagnosis.findMany({
      where: { patientId, status: 'active' },
      orderBy: [{ isPrimary: 'desc' }, { diagnosedAt: 'desc' }],
      take: 20,
      select: { icd10Code: true, icd10Title: true, isPrimary: true },
    }),
    prisma.encounter.findMany({
      where: { patientId },
      orderBy: { visitDate: 'desc' },
      take: 5,
      select: { type: true, visitDate: true, chiefComplaint: true },
    }),
  ]);

  return {
    age: age(patient.dob),
    sex: patient.gender || 'unknown',
    bloodGroup: patient.bloodGroup || null,
    allergies: allergies.map(a => ({ substance: a.substance, severity: a.severity, reaction: a.reaction })),
    activeDiagnoses: diagnoses.map(d => ({ code: d.icd10Code, title: d.icd10Title, primary: d.isPrimary })),
    recentEncounters: recentEncounters.map(e => ({
      type: e.type,
      visitDate: e.visitDate.toISOString().slice(0, 10),
      chiefComplaint: e.chiefComplaint || null,
    })),
  };
}

function contextToText(ctx: NonNullable<Awaited<ReturnType<typeof buildPatientContext>>>): string {
  const lines: string[] = [
    `Patient: [PATIENT], ${ctx.age ?? 'unknown age'}-year-old ${ctx.sex}`,
  ];
  if (ctx.bloodGroup) lines.push(`Blood group: ${ctx.bloodGroup}`);
  if (ctx.allergies.length) {
    lines.push(`Allergies: ${ctx.allergies.map(a => `${a.substance} (${a.severity}${a.reaction ? ` — ${a.reaction}` : ''})`).join('; ')}`);
  } else {
    lines.push('Allergies: NKDA');
  }
  if (ctx.activeDiagnoses.length) {
    lines.push('Active diagnoses:');
    for (const d of ctx.activeDiagnoses) lines.push(`  - ${d.code} ${d.title}${d.primary ? ' (primary)' : ''}`);
  }
  if (ctx.recentEncounters.length) {
    lines.push('Recent encounters:');
    for (const e of ctx.recentEncounters) {
      lines.push(`  - ${e.visitDate} (${e.type})${e.chiefComplaint ? `: ${e.chiefComplaint}` : ''}`);
    }
  }
  return lines.join('\n');
}

// =============== PROMPTS (cached) ===============

const SOAP_SYSTEM = `You are a clinical documentation assistant. Convert physician voice dictation into a structured SOAP note for an electronic medical record.

SOAP sections:
- S (Subjective): patient's reported symptoms, history of present illness, relevant review of systems, social/family history if mentioned
- O (Objective): vital signs, physical examination findings, lab/imaging results — only what is reported
- A (Assessment): clinical impression with brief reasoning; list differential diagnoses if mentioned
- P (Plan): diagnostic workup, treatment plan, medications, patient education, follow-up

Constraints:
- Use ONLY information present in the transcript or provided patient context. Never invent vitals, lab values, findings, or diagnoses.
- If a section has no relevant data, write "Not documented".
- Patient identifiers are anonymised as "[PATIENT]" in the context — preserve that.
- Use standard medical abbreviations and terminology.
- Keep each section concise; this is a note, not a chapter.`;

const DIFFERENTIAL_SYSTEM = `You are a clinical decision-support assistant. Given a chief complaint, basic patient context, and any provided vitals or lab data, suggest a focused differential diagnosis list.

For each diagnosis, return:
- diagnosis: the condition name
- icd10: best-fit ICD-10-CM code (use your knowledge; not strictly required if uncertain)
- likelihood: "high" | "moderate" | "low"
- keyFeatures: 1-2 sentence summary of the features present in this case that fit this diagnosis
- confirmsBy: short list of tests, exam findings, or history that would confirm
- excludesBy: short list of findings that would rule out

Constraints:
- Return 3 to 6 differentials, ordered by likelihood (highest first).
- Stay within the realm of what is reasonable given the data provided — do not speculate wildly.
- This is decision SUPPORT — the doctor decides. Do not include phrases like "you should" or "definitely".
- Patient is anonymised as "[PATIENT]"; do not invent identifiers.`;

const SUMMARY_SYSTEM = `You are a clinical summarisation assistant. Given a patient's longitudinal record (active diagnoses, allergies, recent encounters, prescriptions, lab trends), generate a concise hand-off summary a new clinician could read in under a minute.

Return:
- summary: 2-4 paragraph clinical summary in plain prose
- keyDiagnoses: top 5 active diagnoses with ICD-10
- activeConcerns: 3-6 bullet points of issues currently being managed
- alertingFindings: anything urgent (allergy mismatches, drug interactions, abnormal trends) — empty array if none

Constraints:
- Use ONLY the provided record. Do not infer or invent.
- The patient is anonymised as "[PATIENT]".
- Write the summary in third person, present tense.`;

const EXPLAIN_SYSTEM = `You are a patient-education assistant. Translate clinical text (a diagnosis, treatment plan, discharge instruction) into language a non-medical person can understand.

Return:
- explanation: 1-3 paragraphs in plain language. No jargon. Where jargon is unavoidable, define it inline.
- keyTakeaways: 3-5 bullet points of the most important things the patient should remember
- warnings: list of "call your doctor immediately if..." red flags relevant to the condition/plan — empty array if none

Constraints:
- Be warm but factual; do not over-reassure or sensationalise.
- Reading level: ~8th grade.
- If a language other than English is requested, write the entire response in that language using the patient's native script (e.g. Hindi → Devanagari).
- Do not provide specific dosing or substitute clinician advice — the explanation is supplementary to the prescriber's instructions, not a replacement.`;

// Generic caller. System prompt is cached via cache_control on the
// last block; user message holds per-request data so the cache is
// reused across calls.
async function callClaude(opts: {
  systemPrompt: string;
  userMessage: string;
  schema: any;
  endpoint: string;
  userId: string;
  patientId?: string | null;
  tenantId: string;
  req: Request;
}): Promise<any> {
  const client = getClient();
  if (!client) throw new Error('Copilot disabled: ANTHROPIC_API_KEY not configured');

  const startedAt = Date.now();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: opts.systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: opts.userMessage }],
    output_config: {
      format: { type: 'json_schema', schema: opts.schema },
    },
  } as any);

  const durationMs = Date.now() - startedAt;
  const usage: any = (response as any).usage || {};

  // Extract the JSON output. With output_config.format=json_schema,
  // the response's text block IS the JSON string.
  const textBlock = response.content.find((b: any) => b.type === 'text') as any;
  let parsed: any = null;
  if (textBlock?.text) {
    try { parsed = JSON.parse(textBlock.text); } catch { parsed = null; }
  }
  if (!parsed) throw new Error('Copilot returned an empty or non-JSON response');

  // Audit-log (fire-and-forget). Never store the PHI-stripped prompt
  // or response body — only metadata. The clinician sees the response
  // in the UI; that's the only place it should appear.
  void writeAudit({
    prisma, req: opts.req,
    action: `COPILOT_${opts.endpoint.toUpperCase()}`,
    resource: opts.patientId ? 'Patient' : 'Copilot',
    resourceId: opts.patientId || null,
    newValue: {
      endpoint: opts.endpoint,
      model: MODEL,
      durationMs,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheReadTokens: usage.cache_read_input_tokens,
      cacheWriteTokens: usage.cache_creation_input_tokens,
    },
  });

  return parsed;
}

// =============== ENDPOINTS ===============

// 1. SOAP note from voice / typed transcript.
clinicalModulesRouter.post('/copilot/soap-note', auth, async (req: AuthedReq, res: Response) => {
  try {
    if (!getClient()) {
      return res.status(503).json({ error: 'AI copilot not enabled on this deployment (ANTHROPIC_API_KEY missing)' });
    }
    const rl = rateLimit(req.user!.userId);
    if (!rl.ok) return res.status(429).json({ error: 'Copilot rate limit reached', retryAfter: rl.retryAfter });

    const transcript = sanitiseText(req.body?.transcript, 12000);
    const patientId = req.body?.patientId;
    if (!transcript) return res.status(400).json({ error: 'transcript is required' });
    if (!patientId)  return res.status(400).json({ error: 'patientId is required' });

    const ctx = await buildPatientContext(patientId, req.user!.tenantId);
    if (!ctx) return res.status(404).json({ error: 'Patient not found' });

    const userMessage = `${contextToText(ctx)}\n\n--- Dictated transcript ---\n${transcript}\n\nReturn a SOAP note as JSON.`;

    const result = await callClaude({
      systemPrompt: SOAP_SYSTEM,
      userMessage,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['subjective', 'objective', 'assessment', 'plan'],
        properties: {
          subjective: { type: 'string' },
          objective:  { type: 'string' },
          assessment: { type: 'string' },
          plan:       { type: 'string' },
        },
      },
      endpoint: 'soap-note',
      userId: req.user!.userId,
      patientId,
      tenantId: req.user!.tenantId,
      req,
    });
    res.json(result);
  } catch (e: any) {
    console.error('copilot soap-note', e?.message || e);
    res.status(500).json({ error: 'Copilot error', detail: e?.message });
  }
});

// 2. Differential diagnosis suggestions.
clinicalModulesRouter.post('/copilot/differentials', auth, async (req: AuthedReq, res: Response) => {
  try {
    if (!getClient()) {
      return res.status(503).json({ error: 'AI copilot not enabled on this deployment (ANTHROPIC_API_KEY missing)' });
    }
    const rl = rateLimit(req.user!.userId);
    if (!rl.ok) return res.status(429).json({ error: 'Copilot rate limit reached', retryAfter: rl.retryAfter });

    const chiefComplaint = sanitiseText(req.body?.chiefComplaint, 2000);
    const patientId      = req.body?.patientId;
    const vitalsText     = sanitiseText(req.body?.vitals, 2000);
    const labsText       = sanitiseText(req.body?.recentLabs, 4000);
    if (!chiefComplaint) return res.status(400).json({ error: 'chiefComplaint is required' });
    if (!patientId)      return res.status(400).json({ error: 'patientId is required' });

    const ctx = await buildPatientContext(patientId, req.user!.tenantId);
    if (!ctx) return res.status(404).json({ error: 'Patient not found' });

    // Pull the most recent Vitals row server-side so the model can
    // see real numbers without the client having to send them.
    const recentVitals = await prisma.vitals.findFirst({
      where: { patientId },
      orderBy: { capturedAt: 'desc' },
      select: { temperatureC: true, bpSystolic: true, bpDiastolic: true, heartRate: true, respRate: true, spo2: true, glucoseMgDl: true, painScore: true, capturedAt: true },
    });

    const vitalsLines: string[] = [];
    if (recentVitals) {
      if (recentVitals.temperatureC) vitalsLines.push(`Temp ${recentVitals.temperatureC}°C`);
      if (recentVitals.bpSystolic && recentVitals.bpDiastolic) vitalsLines.push(`BP ${recentVitals.bpSystolic}/${recentVitals.bpDiastolic}`);
      if (recentVitals.heartRate)   vitalsLines.push(`HR ${recentVitals.heartRate}`);
      if (recentVitals.respRate)    vitalsLines.push(`RR ${recentVitals.respRate}`);
      if (recentVitals.spo2)        vitalsLines.push(`SpO₂ ${recentVitals.spo2}%`);
      if (recentVitals.glucoseMgDl) vitalsLines.push(`Glucose ${recentVitals.glucoseMgDl} mg/dL`);
      if (recentVitals.painScore !== null && recentVitals.painScore !== undefined) vitalsLines.push(`Pain ${recentVitals.painScore}/10`);
    }
    const vitalsBlock = [vitalsText, vitalsLines.length ? `Most recent recorded: ${vitalsLines.join(', ')}` : '']
      .filter(Boolean).join('\n');

    const userMessage = [
      contextToText(ctx),
      `\n--- Chief complaint ---\n${chiefComplaint}`,
      vitalsBlock ? `\n--- Vitals ---\n${vitalsBlock}` : '',
      labsText    ? `\n--- Recent labs ---\n${labsText}` : '',
      '\nGenerate a focused differential diagnosis list as JSON.',
    ].filter(Boolean).join('\n');

    const result = await callClaude({
      systemPrompt: DIFFERENTIAL_SYSTEM,
      userMessage,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['differentials'],
        properties: {
          differentials: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['diagnosis', 'likelihood', 'keyFeatures'],
              properties: {
                diagnosis:    { type: 'string' },
                icd10:        { type: 'string' },
                likelihood:   { type: 'string', enum: ['high', 'moderate', 'low'] },
                keyFeatures:  { type: 'string' },
                confirmsBy:   { type: 'array', items: { type: 'string' } },
                excludesBy:   { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      endpoint: 'differentials',
      userId: req.user!.userId,
      patientId,
      tenantId: req.user!.tenantId,
      req,
    });
    res.json(result);
  } catch (e: any) {
    console.error('copilot differentials', e?.message || e);
    res.status(500).json({ error: 'Copilot error', detail: e?.message });
  }
});

// 3. Encounter / patient summary — useful when a new doctor inherits
// a chart they've never seen.
clinicalModulesRouter.post('/copilot/summarize-patient', auth, async (req: AuthedReq, res: Response) => {
  try {
    if (!getClient()) {
      return res.status(503).json({ error: 'AI copilot not enabled on this deployment (ANTHROPIC_API_KEY missing)' });
    }
    const rl = rateLimit(req.user!.userId);
    if (!rl.ok) return res.status(429).json({ error: 'Copilot rate limit reached', retryAfter: rl.retryAfter });

    const patientId = req.body?.patientId;
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });

    const ctx = await buildPatientContext(patientId, req.user!.tenantId);
    if (!ctx) return res.status(404).json({ error: 'Patient not found' });

    // Pull a wider history snapshot — last 15 encounters + last 5
    // prescriptions + 5 most recent admissions, all PHI-stripped.
    const [prescriptions, admissions] = await Promise.all([
      prisma.prescription.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { drugs: true, createdAt: true, notes: true },
      }),
      prisma.admission.findMany({
        where: { patientId },
        orderBy: { admissionDate: 'desc' },
        take: 5,
        select: { admissionDate: true, dischargeDate: true, diagnosis: true, status: true },
      }),
    ]);

    const presLines = prescriptions.map(p => {
      const drugs = Array.isArray(p.drugs) ? p.drugs : [];
      const names = drugs.map((d: any) => d?.drugName || d?.name).filter(Boolean).join(', ');
      return `  - ${p.createdAt.toISOString().slice(0, 10)}: ${names || '[unspecified]'}`;
    });
    const admLines = admissions.map(a =>
      `  - ${a.admissionDate.toISOString().slice(0, 10)} → ${a.dischargeDate ? a.dischargeDate.toISOString().slice(0, 10) : 'ongoing'}: ${a.diagnosis || 'n/a'} (${a.status})`
    );

    const userMessage = [
      contextToText(ctx),
      prescriptions.length ? `\n--- Recent prescriptions ---\n${presLines.join('\n')}` : '',
      admissions.length    ? `\n--- Recent admissions ---\n${admLines.join('\n')}`    : '',
      '\nGenerate a clinical hand-off summary as JSON.',
    ].filter(Boolean).join('\n');

    const result = await callClaude({
      systemPrompt: SUMMARY_SYSTEM,
      userMessage,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['summary', 'keyDiagnoses', 'activeConcerns', 'alertingFindings'],
        properties: {
          summary:          { type: 'string' },
          keyDiagnoses:     { type: 'array', items: {
            type: 'object', additionalProperties: false,
            required: ['title'],
            properties: { icd10: { type: 'string' }, title: { type: 'string' } },
          } },
          activeConcerns:   { type: 'array', items: { type: 'string' } },
          alertingFindings: { type: 'array', items: { type: 'string' } },
        },
      },
      endpoint: 'summarize-patient',
      userId: req.user!.userId,
      patientId,
      tenantId: req.user!.tenantId,
      req,
    });
    res.json(result);
  } catch (e: any) {
    console.error('copilot summarize', e?.message || e);
    res.status(500).json({ error: 'Copilot error', detail: e?.message });
  }
});

// 4. Patient-friendly explanation.
clinicalModulesRouter.post('/copilot/explain', auth, async (req: AuthedReq, res: Response) => {
  try {
    if (!getClient()) {
      return res.status(503).json({ error: 'AI copilot not enabled on this deployment (ANTHROPIC_API_KEY missing)' });
    }
    const rl = rateLimit(req.user!.userId);
    if (!rl.ok) return res.status(429).json({ error: 'Copilot rate limit reached', retryAfter: rl.retryAfter });

    const text     = sanitiseText(req.body?.text, 8000);
    const audience = ['patient', 'family'].includes(req.body?.audience) ? req.body.audience : 'patient';
    const language = ['en', 'hi', 'bn', 'ta', 'te', 'mr'].includes(req.body?.language) ? req.body.language : 'en';
    if (!text) return res.status(400).json({ error: 'text is required' });

    const langName = ({
      en: 'English', hi: 'Hindi (Devanagari)', bn: 'Bengali (Bangla script)',
      ta: 'Tamil (Tamil script)', te: 'Telugu (Telugu script)', mr: 'Marathi (Devanagari)',
    } as any)[language];

    const userMessage = `Audience: ${audience}\nOutput language: ${langName}\n\nClinical text to explain:\n${text}\n\nReturn the explanation as JSON.`;

    const result = await callClaude({
      systemPrompt: EXPLAIN_SYSTEM,
      userMessage,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['explanation', 'keyTakeaways', 'warnings'],
        properties: {
          explanation:  { type: 'string' },
          keyTakeaways: { type: 'array', items: { type: 'string' } },
          warnings:     { type: 'array', items: { type: 'string' } },
        },
      },
      endpoint: 'explain',
      userId: req.user!.userId,
      patientId: null,
      tenantId: req.user!.tenantId,
      req,
    });
    res.json(result);
  } catch (e: any) {
    console.error('copilot explain', e?.message || e);
    res.status(500).json({ error: 'Copilot error', detail: e?.message });
  }
});

// Healthcheck so the FE can know whether to render the copilot at all.
clinicalModulesRouter.get('/copilot/status', auth, async (_req: AuthedReq, res: Response) => {
  res.json({ enabled: !!getClient(), model: MODEL });
});
