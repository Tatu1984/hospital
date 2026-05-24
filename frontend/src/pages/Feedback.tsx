// Patient Feedback / NPS — staff-side dashboard.
//
// Pulls /api/nps/summary + the recent /api/nps list for the chosen
// source. Renders the headline NPS score (with colour cue), per-topic
// average bars, and a comments stream. Source filter lets the QA team
// slice by service line — OPD vs IPD vs ER vs general.

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Star, MessageSquareQuote, ThumbsUp, ThumbsDown, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import api from '../services/api';

interface NpsSummary {
  total: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps: number;
  avgScore: number;
  bySource?: Record<string, { total: number; nps: number }>;
  byTopic?: Record<string, number>;
  commentsCount?: number;
}

interface NpsResponse {
  id: string;
  source: string;
  score: number;
  comment?: string | null;
  ratings?: Record<string, number> | null;
  contact?: string | null;
  createdAt: string;
}

const SOURCES = [
  { value: 'all',           label: 'All sources' },
  { value: 'opd_visit',     label: 'OPD visit' },
  { value: 'ipd_discharge', label: 'IPD discharge' },
  { value: 'er_visit',      label: 'ER visit' },
  { value: 'general',       label: 'General' },
];

const TOPIC_LABELS: Record<string, string> = {
  doctor: 'Doctor',
  nursing: 'Nursing',
  cleanliness: 'Cleanliness',
  billing: 'Billing',
  food: 'Food',
};

export default function Feedback() {
  const [source, setSource] = useState('all');
  const [summary, setSummary] = useState<NpsSummary | null>(null);
  const [responses, setResponses] = useState<NpsResponse[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const sumParams: any = {};
      const listParams: any = {};
      if (source !== 'all') { sumParams.source = source; listParams.source = source; }
      const [s, l] = await Promise.all([
        api.get<NpsSummary>('/api/nps/summary', { params: sumParams }).catch(() => ({ data: null as any })),
        api.get<NpsResponse[]>('/api/nps', { params: listParams }).catch(() => ({ data: [] })),
      ]);
      setSummary(s.data);
      setResponses((l.data || []).slice(0, 50));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [source]);

  const npsColor = useMemo(() => {
    const nps = summary?.nps ?? 0;
    if (nps >= 30) return 'text-emerald-600';
    if (nps >= 0)  return 'text-amber-600';
    return 'text-red-600';
  }, [summary]);

  const promoterPct = summary && summary.total > 0 ? Math.round((summary.promoters / summary.total) * 100) : 0;
  const detractorPct = summary && summary.total > 0 ? Math.round((summary.detractors / summary.total) * 100) : 0;

  const topicData = useMemo(() => {
    const map = summary?.byTopic || {};
    return Object.keys(TOPIC_LABELS).map(k => ({
      topic: TOPIC_LABELS[k],
      avg: Math.round((map[k] || 0) * 10) / 10,
    }));
  }, [summary]);

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center ring-1 ring-emerald-100">
              <Star className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Patient Feedback / NPS</h1>
              <p className="text-sm text-slate-500 mt-0.5">Net Promoter Score, topic ratings, and recent comments</p>
            </div>
          </div>
          <div className="w-56">
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-slate-200/70 shadow-sm lg:col-span-1">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">NPS score</div>
              {loading ? <Skeleton className="h-16 w-32 mt-3" /> : (
                <div className={`text-6xl font-bold mt-2 tracking-tight ${npsColor}`}>
                  {summary?.nps ?? 0}
                </div>
              )}
              <div className="text-xs text-slate-500 mt-2">
                {summary && summary.nps >= 30 ? 'Excellent' : summary && summary.nps >= 0 ? 'Improving' : 'Critical'}
              </div>
            </CardContent>
          </Card>

          <StatBlock
            label="Total responses"
            value={summary?.total ?? 0}
            icon={<MessageSquareQuote className="w-4 h-4 text-blue-600" />}
            tint="bg-blue-50 ring-blue-100"
            loading={loading}
          />
          <StatBlock
            label="Promoters"
            value={summary?.promoters ?? 0}
            sub={`${promoterPct}% of responses`}
            icon={<ThumbsUp className="w-4 h-4 text-emerald-600" />}
            tint="bg-emerald-50 ring-emerald-100"
            accent="text-emerald-700"
            loading={loading}
          />
          <StatBlock
            label="Detractors"
            value={summary?.detractors ?? 0}
            sub={`${detractorPct}% of responses`}
            icon={<ThumbsDown className="w-4 h-4 text-red-600" />}
            tint="bg-red-50 ring-red-100"
            accent="text-red-700"
            loading={loading}
          />
        </div>

        {/* TOPIC BARS */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-medium text-slate-600">Average rating by topic</CardTitle>
              <div className="text-xs text-slate-500 mt-0.5">Out of 5 — measured per response</div>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent className="h-64">
            {loading ? <Skeleton className="h-full w-full rounded-xl" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="topic" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="avg" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* COMMENTS */}
        <Card className="rounded-2xl border-slate-200/70 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white">
            <CardTitle className="text-base text-slate-900">Recent comments — last {responses.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : responses.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400">No responses yet for this filter.</div>
            ) : (
              <div>
                {responses.map(r => (
                  <div key={r.id} className="px-6 py-4 border-b border-slate-100 last:border-b-0 flex items-start gap-4">
                    <ScoreChip score={r.score} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {SOURCES.find(s => s.value === r.source)?.label || r.source}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-sm text-slate-900 mt-1.5 whitespace-pre-line">
                        {r.comment || <span className="text-slate-400 italic">No comment</span>}
                      </div>
                      {r.ratings && (
                        <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                          {Object.entries(r.ratings).map(([k, v]) => (
                            <span key={k} className="px-1.5 py-0.5 rounded bg-slate-50">
                              {TOPIC_LABELS[k] || k}: <span className="text-slate-700 font-medium">{v}/5</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatBlock({ label, value, sub, icon, tint, accent, loading }: {
  label: string; value: number; sub?: string; icon: React.ReactNode; tint: string; accent?: string; loading?: boolean;
}) {
  return (
    <Card className="rounded-2xl border-slate-200/70 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</div>
          <div className={`w-8 h-8 rounded-lg ${tint} ring-1 flex items-center justify-center`}>{icon}</div>
        </div>
        {loading
          ? <Skeleton className="h-8 w-16 mt-3" />
          : <div className={`text-3xl font-semibold ${accent || 'text-slate-900'} mt-2 tracking-tight`}>{value}</div>}
        {sub && !loading && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function ScoreChip({ score }: { score: number }) {
  if (score < 0) {
    return <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 text-xs font-medium flex items-center justify-center shrink-0">SKIP</div>;
  }
  let tint = 'bg-emerald-100 text-emerald-700';
  if (score <= 6) tint = 'bg-red-100 text-red-700';
  else if (score <= 8) tint = 'bg-amber-100 text-amber-700';
  return (
    <div className={`w-12 h-12 rounded-xl ${tint} text-xl font-semibold flex items-center justify-center shrink-0 tabular-nums`}>
      {score}
    </div>
  );
}
