// Login Security — admin view of "who logged in, from where, on what device,
// and how risky was it". This is the IP-tracking / geolocation accuracy layer:
//   - per-login IP geolocation (city → district/locality → postal, ISP/ASN,
//     VPN/proxy flag, IP timezone)
//   - precise browser GPS (metre-accurate) when the user has consented
//   - an anomaly/risk score (impossible travel, new device/country, concurrent
//     sessions from another network, timezone mismatch, VPN)
//   - active sessions + per-user location-consent state
//
// Flagged logins can be Approved, which allowlists that (user, IP) so it stops
// re-flagging. Backed by GET /api/admin/login-security and
// POST /api/admin/auth-events/:id/approve.

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  RefreshCw, ShieldAlert, MapPin, Monitor, Wifi, Crosshair,
  CheckCircle2, AlertTriangle, Globe,
} from 'lucide-react';
import { securityAPI } from '../services/api';

interface Anomaly { code: string; severity: 'low' | 'medium' | 'high'; detail: string }

interface AuthEvent {
  id: string;
  eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'SESSION_EXPIRED' | 'SESSION_REVOKED';
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  usernameTried: string | null;
  failureReason: string | null;
  ipAddress: string | null;
  city: string | null;
  district: string | null;
  region: string | null;
  postal: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  geoSource: string | null;
  isp: string | null;
  asn: string | null;
  isVpnOrProxy: boolean | null;
  ipTimezone: string | null;
  browserName: string | null;
  osName: string | null;
  deviceType: string | null;
  clientTimezone: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  gpsAccuracyM: number | null;
  anomalies: Anomaly[] | null;
  riskScore: number | null;
  trusted: boolean;
  createdAt: string;
}

interface LoginSession {
  id: string;
  sessionId: string;
  userId: string;
  userName: string | null;
  ipAddress: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  asn: string | null;
  isVpnOrProxy: boolean | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

interface LocationConsent {
  id: string;
  userId: string;
  userName: string | null;
  status: 'PENDING' | 'GRANTED' | 'DENIED';
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
  capturedAt: string | null;
  respondedAt: string | null;
  updatedAt: string;
}

interface Payload {
  events: AuthEvent[];
  sessions: LoginSession[];
  consents: LocationConsent[];
}

function fmt(ts: string | null): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function locationLabel(e: AuthEvent | LoginSession): string {
  const parts = [
    (e as AuthEvent).district,
    e.city,
    e.region,
    e.country,
  ].filter(Boolean);
  return parts.length ? Array.from(new Set(parts)).join(', ') : '—';
}

function mapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function RiskBadge({ score }: { score: number | null }) {
  const s = score ?? 0;
  if (s >= 60) return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">High · {s}</Badge>;
  if (s >= 35) return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Medium · {s}</Badge>;
  if (s > 0) return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Low · {s}</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">OK</Badge>;
}

export default function LoginSecurity() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await securityAPI.loginSecurity(400);
      setData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load login-security data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: string) => {
    setApproving(id);
    try {
      await securityAPI.approveEvent(id);
      await load();
    } catch {
      /* surfaced on next load */
    } finally {
      setApproving(null);
    }
  };

  const events = data?.events ?? [];
  const sessions = data?.sessions ?? [];
  const consents = data?.consents ?? [];

  const flagged = events.filter((e) => (e.riskScore ?? 0) > 0 && !e.trusted);
  const grantedConsents = consents.filter((c) => c.status === 'GRANTED').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-blue-600" />
            Login Security
          </h1>
          <p className="text-sm text-slate-500">
            Per-login IP geolocation, precise GPS, device fingerprint and anomaly risk scoring.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Login events</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{events.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Flagged (risk &gt; 0)</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{flagged.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Active sessions</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{sessions.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>GPS consent granted</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600">{grantedConsents}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="flagged">
        <TabsList>
          <TabsTrigger value="flagged">Flagged ({flagged.length})</TabsTrigger>
          <TabsTrigger value="events">All events ({events.length})</TabsTrigger>
          <TabsTrigger value="sessions">Active sessions ({sessions.length})</TabsTrigger>
          <TabsTrigger value="consents">Location consent ({consents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="flagged">
          <EventsTable events={flagged} onApprove={approve} approving={approving} emptyText="No flagged logins. 🎉" />
        </TabsContent>
        <TabsContent value="events">
          <EventsTable events={events} onApprove={approve} approving={approving} emptyText="No login events yet." />
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>IP / Network</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Last seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-8">No active sessions.</TableCell></TableRow>
                  )}
                  {sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.userName || s.userId}</TableCell>
                      <TableCell><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-400" />{locationLabel(s)}</span></TableCell>
                      <TableCell>
                        <div className="text-sm">{s.ipAddress || '—'}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          {s.asn || s.region || ''}
                          {s.isVpnOrProxy && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">VPN</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{fmt(s.createdAt)}</TableCell>
                      <TableCell className="text-sm text-slate-500">{fmt(s.lastSeenAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consents">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Precise fix</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Captured</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consents.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-8">No consent records yet.</TableCell></TableRow>
                  )}
                  {consents.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.userName || c.userId}</TableCell>
                      <TableCell>
                        {c.status === 'GRANTED' && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Granted</Badge>}
                        {c.status === 'DENIED' && <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Denied</Badge>}
                        {c.status === 'PENDING' && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>}
                      </TableCell>
                      <TableCell>
                        {c.latitude != null && c.longitude != null ? (
                          <a className="inline-flex items-center gap-1 text-blue-600 hover:underline" href={mapsLink(c.latitude, c.longitude)} target="_blank" rel="noreferrer">
                            <Crosshair className="h-3.5 w-3.5" />{c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}
                          </a>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{c.accuracyM != null ? `±${Math.round(c.accuracyM)} m` : '—'}</TableCell>
                      <TableCell className="text-sm text-slate-500">{fmt(c.capturedAt)}</TableCell>
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

function EventsTable({
  events,
  onApprove,
  approving,
  emptyText,
}: {
  events: AuthEvent[];
  onApprove: (id: string) => void;
  approving: string | null;
  emptyText: string;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>IP / Network</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Risk / Anomalies</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-8">{emptyText}</TableCell></TableRow>
            )}
            {events.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs text-slate-500 whitespace-nowrap">{fmt(e.createdAt)}</TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{e.userName || e.usernameTried || '—'}</div>
                  {e.userRole && <div className="text-xs text-slate-400">{e.userRole}</div>}
                </TableCell>
                <TableCell>
                  {e.eventType === 'LOGIN_SUCCESS' && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Success</Badge>}
                  {e.eventType === 'LOGIN_FAILED' && <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Failed</Badge>}
                  {e.eventType === 'LOGOUT' && <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Logout</Badge>}
                  {(e.eventType === 'SESSION_EXPIRED' || e.eventType === 'SESSION_REVOKED') && <Badge variant="outline">{e.eventType}</Badge>}
                </TableCell>
                <TableCell>
                  <div className="inline-flex items-center gap-1 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />{locationLabel(e)}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    {e.postal && <span>{e.postal}</span>}
                    {e.gpsLatitude != null && e.gpsLongitude != null && (
                      <a className="inline-flex items-center gap-0.5 text-blue-600 hover:underline" href={mapsLink(e.gpsLatitude, e.gpsLongitude)} target="_blank" rel="noreferrer">
                        <Crosshair className="h-3 w-3" />GPS{e.gpsAccuracyM != null ? ` ±${Math.round(e.gpsAccuracyM)}m` : ''}
                      </a>
                    )}
                    {e.geoSource && <span className="inline-flex items-center gap-0.5"><Globe className="h-3 w-3" />{e.geoSource}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{e.ipAddress || '—'}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <Wifi className="h-3 w-3" />{e.isp || e.asn || '—'}
                    {e.isVpnOrProxy && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 ml-1">VPN</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="inline-flex items-center gap-1 text-sm">
                    <Monitor className="h-3.5 w-3.5 text-slate-400" />
                    {[e.browserName, e.osName].filter(Boolean).join(' · ') || e.deviceType || '—'}
                  </div>
                  {e.clientTimezone && e.ipTimezone && e.clientTimezone !== e.ipTimezone && (
                    <div className="text-xs text-amber-600">tz {e.clientTimezone} ≠ {e.ipTimezone}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <RiskBadge score={e.riskScore} />
                    {e.anomalies?.map((a, i) => (
                      <span key={i} title={a.detail} className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />{a.code}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {e.trusted ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />Trusted</span>
                  ) : (e.riskScore ?? 0) > 0 && e.userId && e.ipAddress ? (
                    <Button size="sm" variant="outline" disabled={approving === e.id} onClick={() => onApprove(e.id)}>
                      {approving === e.id ? 'Approving…' : 'Approve IP'}
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
