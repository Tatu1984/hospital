// Clinical Copilot drawer — wraps four Claude-powered tools behind a
// single button on the patient profile.
//
//   1. SOAP from dictation  (voice / paste → structured note)
//   2. Differentials         (chief complaint + vitals → ranked DDx)
//   3. Patient summary       (handoff one-pager from the full chart)
//   4. Plain-language explain (jargon-to-patient translator)
//
// Renders nothing if /api/copilot/status returns `enabled: false`
// (deployment hasn't set ANTHROPIC_API_KEY). PHI never leaves the
// backend's PHI-stripping context builder — the FE only sends drug
// names, complaints, transcripts. Patient identifiers are looked up
// server-side from the authenticated session.

import { useEffect, useRef, useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Mic, MicOff, FileText, Activity, Languages, ClipboardCopy, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '../services/api';
import { useToast } from './Toast';

interface Props {
  patientId: string;
  // Initial text seeded into the "explain" tool — e.g. a discharge
  // summary's diagnosis a clinician wants to send to the patient.
  initialExplainText?: string;
}

// ---- types matching the backend JSON-schema responses ----
interface SoapNote {
  subjective: string;
  objective:  string;
  assessment: string;
  plan:       string;
}
interface Differential {
  diagnosis:   string;
  icd10?:      string;
  likelihood:  'high' | 'moderate' | 'low';
  keyFeatures: string;
  confirmsBy?: string[];
  excludesBy?: string[];
}
interface DifferentialsResult { differentials: Differential[] }
interface PatientSummary {
  summary: string;
  keyDiagnoses: { icd10?: string; title: string }[];
  activeConcerns: string[];
  alertingFindings: string[];
}
interface ExplainResult {
  explanation: string;
  keyTakeaways: string[];
  warnings: string[];
}

const LIKELIHOOD_TINT: Record<Differential['likelihood'], string> = {
  high:     'bg-red-50    text-red-700    ring-red-200',
  moderate: 'bg-amber-50  text-amber-700  ring-amber-200',
  low:      'bg-slate-50  text-slate-600  ring-slate-200',
};

export default function ClinicalCopilot({ patientId, initialExplainText = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'soap' | 'ddx' | 'summary' | 'explain'>('soap');
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const toast = useToast();

  // On first open, ping /status. We don't bother polling — clinicians
  // can refresh the page if the operator just turned the feature on.
  useEffect(() => {
    if (enabled !== null) return;
    api.get<{ enabled: boolean }>('/api/copilot/status')
      .then(r => setEnabled(!!r.data?.enabled))
      .catch(() => setEnabled(false));
  }, [enabled]);

  // The copilot button is the trigger. We render it always, but if
  // /status said "disabled" the button just shows a warning toast on
  // click instead of opening the drawer — gives staff a hint about
  // why the feature is dark rather than silently hiding it.
  function handleOpen() {
    if (enabled === false) {
      toast.error('AI copilot disabled', 'This deployment hasn’t configured the Anthropic API key. Contact your administrator.');
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm"
        title="AI clinical copilot"
      >
        <Sparkles className="w-4 h-4" />
        AI Copilot
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent width="max-w-2xl">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 ring-1 ring-violet-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <SheetTitle>Clinical Copilot</SheetTitle>
                <SheetDescription>
                  Drafts SOAP notes, suggests differentials, summarises charts, and translates jargon. <strong className="text-slate-700">You always review and edit.</strong>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <SheetBody>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="soap"    className="gap-1.5"><FileText className="w-3.5 h-3.5" />SOAP</TabsTrigger>
                <TabsTrigger value="ddx"     className="gap-1.5"><Activity className="w-3.5 h-3.5" />DDx</TabsTrigger>
                <TabsTrigger value="summary" className="gap-1.5"><FileText className="w-3.5 h-3.5" />Summary</TabsTrigger>
                <TabsTrigger value="explain" className="gap-1.5"><Languages className="w-3.5 h-3.5" />Explain</TabsTrigger>
              </TabsList>

              <TabsContent value="soap"    className="mt-4"><SoapPanel    patientId={patientId} /></TabsContent>
              <TabsContent value="ddx"     className="mt-4"><DdxPanel     patientId={patientId} /></TabsContent>
              <TabsContent value="summary" className="mt-4"><SummaryPanel patientId={patientId} /></TabsContent>
              <TabsContent value="explain" className="mt-4"><ExplainPanel initialText={initialExplainText} /></TabsContent>
            </Tabs>

            <div className="mt-6 p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-[12px] text-amber-800 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Output is decision support, not a clinical decision. Patient identifiers are stripped before requests leave the server.
                Every call is audit-logged with your user ID and the patient context shown.
              </span>
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ============== SOAP panel ==============
function SoapPanel({ patientId }: { patientId: string }) {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<SoapNote | null>(null);
  const [listening, setListening]   = useState(false);
  const recogRef = useRef<any>(null);
  const toast = useToast();

  // Web Speech API — free, no server roundtrip. Works on Chrome, Edge,
  // Safari (limited). Fallback: paste a typed transcript.
  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error('Voice unavailable', 'Your browser doesn’t support live transcription. Type or paste the transcript.');
      return;
    }
    if (listening) { recogRef.current?.stop(); setListening(false); return; }
    const recog = new SR();
    recog.lang = 'en-IN'; // Indian-English accent model
    recog.interimResults = true;
    recog.continuous = true;
    let buffer = transcript;
    recog.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) buffer += r[0].transcript + ' ';
        else interim += r[0].transcript;
      }
      setTranscript((buffer + interim).replace(/\s+/g, ' '));
    };
    recog.onend = () => setListening(false);
    recog.onerror = (e: any) => {
      console.warn('SR error', e.error);
      setListening(false);
    };
    recog.start();
    recogRef.current = recog;
    setListening(true);
  }

  async function submit() {
    if (!transcript.trim()) { toast.error('Need a transcript', 'Dictate or paste something first.'); return; }
    setLoading(true); setResult(null);
    try {
      const r = await api.post<SoapNote>('/api/copilot/soap-note', { patientId, transcript });
      setResult(r.data);
    } catch (e: any) {
      handleCopilotError(e, toast);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-slate-500 mb-1.5 block">Dictation transcript</Label>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Type, paste, or dictate the encounter — e.g. 'Patient reports 3 hours of central chest pain radiating to left arm, denies SOB. Vitals: BP 145/90, HR 98, SpO2 98%. Lungs clear, no JVD. Started on aspirin 325mg, ordered ECG and troponin.'"
          className="w-full min-h-[140px] p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={toggleMic} className="gap-1.5">
          {listening
            ? <><MicOff className="w-4 h-4 text-red-600" /> Stop dictation</>
            : <><Mic    className="w-4 h-4" /> Dictate</>}
        </Button>
        <Button onClick={submit} disabled={loading} className="ml-auto gap-1.5 bg-violet-600 hover:bg-violet-700">
          <Sparkles className="w-4 h-4" /> {loading ? 'Drafting…' : 'Draft SOAP'}
        </Button>
      </div>

      {loading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>}
      {result && (
        <div className="space-y-3 pt-2">
          {(['subjective','objective','assessment','plan'] as const).map((k) => (
            <SoapSection key={k} label={k} text={result[k]} />
          ))}
        </div>
      )}
    </div>
  );
}

function SoapSection({ label, text }: { label: string; text: string }) {
  const toast = useToast();
  return (
    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/40">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
        <button
          onClick={() => { navigator.clipboard.writeText(text); toast.success('Copied to clipboard'); }}
          className="text-slate-400 hover:text-slate-700"
          title="Copy section"
        >
          <ClipboardCopy className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">{text}</div>
    </div>
  );
}

// ============== Differentials panel ==============
function DdxPanel({ patientId }: { patientId: string }) {
  const [complaint, setComplaint] = useState('');
  const [vitals,    setVitals]    = useState('');
  const [labs,      setLabs]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState<DifferentialsResult | null>(null);
  const toast = useToast();

  async function submit() {
    if (!complaint.trim()) { toast.error('Need a chief complaint'); return; }
    setLoading(true); setResult(null);
    try {
      const r = await api.post<DifferentialsResult>('/api/copilot/differentials', {
        patientId,
        chiefComplaint: complaint,
        vitals: vitals || undefined,
        recentLabs: labs || undefined,
      });
      setResult(r.data);
    } catch (e: any) {
      handleCopilotError(e, toast);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-slate-500 mb-1.5 block">Chief complaint *</Label>
        <Input
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          placeholder="e.g. 'crushing chest pain for 2 hours, radiating to left arm, with sweating'"
        />
      </div>
      <div>
        <Label className="text-xs text-slate-500 mb-1.5 block">Vitals (optional — server adds most-recent recorded)</Label>
        <textarea
          value={vitals}
          onChange={(e) => setVitals(e.target.value)}
          className="w-full min-h-[60px] p-2.5 border border-slate-200 rounded-lg text-sm"
          placeholder="BP 145/90, HR 110, SpO2 94%, Temp 37.8°C…"
        />
      </div>
      <div>
        <Label className="text-xs text-slate-500 mb-1.5 block">Recent labs (optional)</Label>
        <textarea
          value={labs}
          onChange={(e) => setLabs(e.target.value)}
          className="w-full min-h-[60px] p-2.5 border border-slate-200 rounded-lg text-sm"
          placeholder="Troponin-I 0.8 ng/mL, CK-MB elevated, ECG: ST elevation in II/III/aVF…"
        />
      </div>
      <Button onClick={submit} disabled={loading} className="gap-1.5 bg-violet-600 hover:bg-violet-700 w-full">
        <Sparkles className="w-4 h-4" /> {loading ? 'Generating differentials…' : 'Suggest differentials'}
      </Button>

      {loading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>}
      {result && (
        <div className="space-y-2 pt-2">
          {result.differentials.map((d, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-slate-900">{d.diagnosis}</span>
                {d.icd10 && <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{d.icd10}</span>}
                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ring-1 font-medium ${LIKELIHOOD_TINT[d.likelihood]}`}>
                  {d.likelihood}
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-1.5 leading-relaxed">{d.keyFeatures}</div>
              {(d.confirmsBy?.length || d.excludesBy?.length) && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  {d.confirmsBy?.length && (
                    <div>
                      <div className="text-emerald-700 font-semibold mb-0.5">Confirm by</div>
                      <ul className="text-slate-700 space-y-0.5">{d.confirmsBy.map((x, j) => <li key={j}>• {x}</li>)}</ul>
                    </div>
                  )}
                  {d.excludesBy?.length && (
                    <div>
                      <div className="text-rose-700 font-semibold mb-0.5">Rule out by</div>
                      <ul className="text-slate-700 space-y-0.5">{d.excludesBy.map((x, j) => <li key={j}>• {x}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============== Summary panel ==============
function SummaryPanel({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<PatientSummary | null>(null);
  const toast = useToast();

  async function submit() {
    setLoading(true); setResult(null);
    try {
      const r = await api.post<PatientSummary>('/api/copilot/summarize-patient', { patientId });
      setResult(r.data);
    } catch (e: any) {
      handleCopilotError(e, toast);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Generates a one-screen hand-off summary from the patient’s active diagnoses, allergies, recent encounters,
        prescriptions, and admissions. Useful when you’re seeing a chart for the first time.
      </p>
      <Button onClick={submit} disabled={loading} className="gap-1.5 bg-violet-600 hover:bg-violet-700 w-full">
        <Sparkles className="w-4 h-4" /> {loading ? 'Summarising…' : 'Generate summary'}
      </Button>

      {loading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>}
      {result && (
        <div className="space-y-3 pt-2">
          {result.alertingFindings.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-red-700 font-semibold mb-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Alerting findings
              </div>
              <ul className="text-sm text-red-800 space-y-1">{result.alertingFindings.map((x, i) => <li key={i}>• {x}</li>)}</ul>
            </div>
          )}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/40">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Summary</div>
            <div className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">{result.summary}</div>
          </div>
          {result.keyDiagnoses.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Key diagnoses</div>
              <ul className="text-sm space-y-1">
                {result.keyDiagnoses.map((d, i) => (
                  <li key={i}>
                    {d.icd10 && <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mr-2">{d.icd10}</span>}
                    {d.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.activeConcerns.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Active concerns</div>
              <ul className="text-sm text-slate-700 space-y-1">{result.activeConcerns.map((x, i) => <li key={i}>• {x}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============== Explain panel ==============
function ExplainPanel({ initialText }: { initialText: string }) {
  const [text,     setText]     = useState(initialText);
  const [audience, setAudience] = useState<'patient' | 'family'>('patient');
  const [language, setLanguage] = useState<'en' | 'hi' | 'bn' | 'ta' | 'te' | 'mr'>('en');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<ExplainResult | null>(null);
  const toast = useToast();

  async function submit() {
    if (!text.trim()) { toast.error('Paste the clinical text first'); return; }
    setLoading(true); setResult(null);
    try {
      const r = await api.post<ExplainResult>('/api/copilot/explain', { text, audience, language });
      setResult(r.data);
    } catch (e: any) {
      handleCopilotError(e, toast);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-slate-500 mb-1.5 block">Clinical text to translate</Label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a diagnosis, treatment plan, or discharge summary section."
          className="w-full min-h-[120px] p-2.5 border border-slate-200 rounded-lg text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-500 mb-1.5 block">Audience</Label>
          <Select value={audience} onValueChange={(v) => setAudience(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="patient">Patient (1st person)</SelectItem>
              <SelectItem value="family">Family member</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1.5 block">Language</Label>
          <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
              <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
              <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
              <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
              <SelectItem value="mr">मराठी (Marathi)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={submit} disabled={loading} className="gap-1.5 bg-violet-600 hover:bg-violet-700 w-full">
        <Languages className="w-4 h-4" /> {loading ? 'Translating…' : 'Explain in plain language'}
      </Button>

      {loading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>}
      {result && (
        <div className="space-y-3 pt-2">
          <div className="border border-slate-200 rounded-xl p-3 bg-emerald-50/30">
            <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold mb-1.5">Plain language</div>
            <div className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">{result.explanation}</div>
          </div>
          {result.keyTakeaways.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Key takeaways</div>
              <ul className="text-sm text-slate-700 space-y-1">{result.keyTakeaways.map((x, i) => <li key={i}>• {x}</li>)}</ul>
            </div>
          )}
          {result.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-amber-800 font-semibold mb-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> When to call the doctor
              </div>
              <ul className="text-sm text-amber-900 space-y-1">{result.warnings.map((x, i) => <li key={i}>• {x}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============== shared helpers ==============
function handleCopilotError(e: any, toast: ReturnType<typeof useToast>) {
  const status = e?.response?.status;
  const msg    = e?.response?.data?.error || 'Try again';
  if (status === 503)  toast.error('Copilot disabled', msg);
  else if (status === 429) toast.error('Rate limit hit', `${msg}. Try again in ${e?.response?.data?.retryAfter ?? 60}s.`);
  else                  toast.error('Copilot error', msg);
}
