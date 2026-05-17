// Activity monitor — admin view of who is logged in, from where, and
// what they're doing. Built on the existing AuditLog table; no extra
// schema or network-flow infrastructure required.
//
// Three sections, each backed by a server-side aggregation:
//   1. Active Sessions — users with a LOGIN_SUCCESS + any audit event
//      in the last 15 min. Shows IP + geolocation, last action, idle
//      time.
//   2. Failed Logins (24h) — grouped by source IP. Surfaces
//      brute-force attempts and the usernames being tried.
//   3. Per-User Timeline — pick a user from the sessions list and see
//      their complete chronological audit trail.
//
// Auto-refreshes every 30 seconds. Geolocation is computed server-side
// (cached 24h) so the browser doesn't have to hit any external API.

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  RefreshCw, Activity as ActivityIcon, AlertTriangle, Clock,
  Users as UsersIcon, MapPin, Monitor, Network, ChevronLeft,
} from 'lucide-react';
import api from '../services/api';

interface Geo { kind: string; label: string }

interface ActiveSession {
  userId: string;
  userName: string;
  username: string | null;
  email: string | null;
  ipAddress: string | null;
  geo: Geo;
  userAgent: string | null;
  loginAt: string | null;
  lastSeenAt: string;
  idleSeconds: number;
  lastAction: string;
  lastResource: string | null;
}

interface FailedLogin {
  ipAddress: string;
  geo: Geo;
  count: number;
  lastAt: string;
  usernamesTried: string[];
}

interface OverviewResponse {
  activeSessions: ActiveSession[];
  failedLogins: FailedLogin[];
  summary: {
    activeSessions: number;
    uniqueUsers: number;
    failedLogins24h: number;
    failedSourceIps: number;
    windowStart: string;
    generatedAt: string;
  };
}

interface TimelineEvent {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  geoLabel: string;
  userAgent: string | null;
  timestamp: string;
  summary: string;
}

interface TimelineResponse {
  user: { id: string; name: string; username: string | null; email: string | null };
  events: TimelineEvent[];
}

const REFRESH_MS = 30_000;

function fmtRel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d`;
}
function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}
function geoBadgeClass(g: Geo): string {
  if (g.kind === 'resolved') return 'bg-purple-100 text-purple-800';
  if (g.kind === 'private') return 'bg-slate-100 text-slate-700';
  if (g.kind === 'loopback') return 'bg-slate-100 text-slate-500';
  return 'bg-amber-100 text-amber-800';
}
function shortUA(ua: string | null): string {
  if (!ua) return '—';
  // Cheap UA classifier — full string is on hover.
  if (/iPhone|Android.*Mobile/i.test(ua)) return 'Mobile';
  if (/iPad|Tablet/i.test(ua)) return 'Tablet';
  if (/curl|wget|axios|node-fetch/i.test(ua)) return 'CLI / Script';
  if (/Postman|Insomnia/i.test(ua)) return 'API Client';
  if (/Chrome/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua)) return 'Safari';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Edg/i.test(ua)) return 'Edge';
  return 'Other';
}

export default function ActivityMonitor() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      const r = await api.get('/api/admin/activity/overview');
      setData(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load activity data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading activity monitor…</div>;
  }

  if (selectedUserId) {
    return (
      <UserTimeline
        userId={selectedUserId}
        onBack={() => setSelectedUserId(null)}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Network className="w-6 h-6" /> Activity Monitor
          </h1>
          <p className="text-sm text-slate-500">
            Live view of who is signed in, from where, and what they're doing.
            Auto-refreshes every {REFRESH_MS / 1000}s.
            {data && ` Last update: ${new Date(data.summary.generatedAt).toLocaleTimeString()}`}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={refreshing} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 text-base">Couldn't load activity data</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryTile label="Active Sessions" icon={ActivityIcon} value={data?.summary.activeSessions ?? 0} tone="bg-emerald-50 text-emerald-700" />
        <SummaryTile label="Unique Users" icon={UsersIcon} value={data?.summary.uniqueUsers ?? 0} tone="bg-blue-50 text-blue-700" />
        <SummaryTile label="Failed Logins (24h)" icon={AlertTriangle} value={data?.summary.failedLogins24h ?? 0} tone={(data?.summary.failedLogins24h ?? 0) > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'} />
        <SummaryTile label="Attack Source IPs" icon={MapPin} value={data?.summary.failedSourceIps ?? 0} tone="bg-amber-50 text-amber-700" />
      </div>

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">Active Sessions ({data?.activeSessions.length ?? 0})</TabsTrigger>
          <TabsTrigger value="failed">Failed Logins ({data?.failedLogins.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Users who logged in within the last 24h and were active in the last 15 minutes.
                Click a row to see the full activity timeline for that user.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>IP / Location</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead>Last action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.activeSessions.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        No active sessions in the last 15 minutes.
                      </TableCell>
                    </TableRow>
                  )}
                  {data?.activeSessions.map((s, i) => (
                    <TableRow
                      key={`${s.userId}-${s.ipAddress}-${i}`}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setSelectedUserId(s.userId)}
                    >
                      <TableCell>
                        <div className="font-medium text-slate-900">{s.userName}</div>
                        {s.username && (
                          <div className="text-xs text-slate-500">{s.username}{s.email ? ` • ${s.email}` : ''}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs">{s.ipAddress || '—'}</span>
                          <Badge className={`${geoBadgeClass(s.geo)} border-0 w-fit`}>
                            <MapPin className="w-3 h-3 mr-1" /> {s.geo.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-slate-700" title={s.userAgent || ''}>
                          <Monitor className="w-3 h-3 text-slate-400" /> {shortUA(s.userAgent)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{fmtDateTime(s.loginAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3 text-slate-400" /> {fmtRel(s.idleSeconds)} ago
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.lastAction}</Badge>
                        {s.lastResource && (
                          <span className="ml-2 text-xs text-slate-500">{s.lastResource}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed">
          <Card>
            <CardHeader>
              <CardTitle>Failed Logins (last 24 hours)</CardTitle>
              <CardDescription>
                Grouped by source IP. High counts or unfamiliar geolocations may indicate a brute-force attempt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source IP</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead>Usernames Tried</TableHead>
                    <TableHead>Last Attempt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.failedLogins.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No failed login attempts in the last 24 hours.
                      </TableCell>
                    </TableRow>
                  )}
                  {data?.failedLogins.map((f) => (
                    <TableRow key={f.ipAddress} className={f.count >= 5 ? 'bg-red-50' : ''}>
                      <TableCell className="font-mono text-xs">{f.ipAddress}</TableCell>
                      <TableCell>
                        <Badge className={`${geoBadgeClass(f.geo)} border-0`}>
                          <MapPin className="w-3 h-3 mr-1" /> {f.geo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${f.count >= 5 ? 'text-red-700' : 'text-slate-900'}`}>{f.count}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {f.usernamesTried.length === 0 && <span className="text-xs text-slate-400">—</span>}
                          {f.usernamesTried.map((u) => (
                            <span key={u} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{u}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{fmtDateTime(f.lastAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryTile({ label, icon: Icon, value, tone }: { label: string; icon: any; value: number; tone: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-2xl font-bold mt-1 text-slate-900">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tone}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UserTimeline({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await api.get(`/api/admin/activity/timeline/${userId}?limit=200`);
        setData(r.data);
        setError(null);
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.message || 'Failed to load timeline');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ChevronLeft className="w-4 h-4" /> Back to overview
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{data?.user.name || 'User'} — activity timeline</CardTitle>
          <CardDescription>
            {data?.user.username && <>Username: {data.user.username} · </>}
            {data?.user.email && <>Email: {data.user.email} · </>}
            Latest {data?.events.length ?? 0} events (most recent first).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-center py-8 text-slate-500">Loading…</div>}
          {error && <div className="text-red-600">{error}</div>}
          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP / Location</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.events.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No audit events on file for this user.
                    </TableCell>
                  </TableRow>
                )}
                {data?.events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-slate-600 whitespace-nowrap">{fmtDateTime(e.timestamp)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-slate-900">{e.resource}</div>
                      {e.resourceId && <div className="text-xs text-slate-500 font-mono">{e.resourceId}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-xs">{e.ipAddress || '—'}</span>
                        <span className="text-xs text-slate-500">{e.geoLabel}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 max-w-md truncate" title={e.summary}>
                      {e.summary}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
