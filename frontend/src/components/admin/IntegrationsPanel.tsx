// Integrations Hub — central admin UI for managing third-party API
// connections (SMS, email, payment, telemedicine, accounting, PACS,
// lab analyzer middleware, custom REST). Admins can:
//
//   • Pick from a preset catalog (MSG91, Twilio, Razorpay, Zoom, etc.)
//     for fast setup with the right defaults
//   • Or add a "Custom API" for arbitrary REST endpoints
//   • Bind each integration to one or more HospitalPro modules so the
//     code knows which integration to use at runtime
//   • Test the connection from a Test button
//   • Enable/disable without deleting

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Plug,
  MessageSquare,
  Mail,
  CreditCard,
  Video,
  Calculator,
  Image as ImageIcon,
  TestTube,
  HeartPulse,
  Plus,
  Pencil,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  Power,
  Cog,
} from 'lucide-react';
import api from '../../services/api';

interface Integration {
  id: string;
  name: string;
  category: string;
  provider: string;
  baseUrl: string | null;
  webUrl: string | null;
  authType: string;
  credentials: Record<string, string> | null; // server returns 'set'/'unset'
  headers: Record<string, string> | null;
  targetModules: string[];
  enabled: boolean;
  lastTestedAt: string | null;
  lastTestStatus: 'ok' | 'failed' | 'never' | null;
  lastTestResult: string | null;
  notes: string | null;
}

// Preset cards. Each one pre-fills the Add dialog with the right
// category, provider, baseUrl, authType, and credential field hints.
// Custom API is at the bottom for everything not in the catalog.
interface Preset {
  key: string;
  category: string;
  provider: string;
  label: string;
  description: string;
  icon: any;
  tint: string;
  baseUrl?: string;
  authType: 'api_key' | 'basic' | 'bearer' | 'oauth2' | 'none';
  credentialFields: Array<{ name: string; label: string; placeholder?: string; secret?: boolean }>;
  defaultModules?: string[];
}

const PRESETS: Preset[] = [
  // SMS
  {
    key: 'msg91', category: 'sms', provider: 'msg91', label: 'MSG91', icon: MessageSquare, tint: 'bg-emerald-500',
    description: 'India SMS — DLT-registered templates for OTP + reminders',
    baseUrl: 'https://control.msg91.com/api', authType: 'api_key',
    credentialFields: [
      { name: 'apiKey', label: 'Auth Key', secret: true },
      { name: 'senderId', label: 'Sender ID (6 chars)', placeholder: 'BUSITA' },
      { name: 'templateIdOtp', label: 'OTP DLT Template ID' },
    ],
    defaultModules: ['appointments', 'auth', 'opd'],
  },
  {
    key: 'twilio', category: 'sms', provider: 'twilio', label: 'Twilio', icon: MessageSquare, tint: 'bg-red-500',
    description: 'Global SMS / WhatsApp / voice',
    baseUrl: 'https://api.twilio.com/2010-04-01', authType: 'basic',
    credentialFields: [
      { name: 'username', label: 'Account SID' },
      { name: 'password', label: 'Auth Token', secret: true },
      { name: 'fromNumber', label: 'From number', placeholder: '+1...' },
    ],
    defaultModules: ['appointments', 'auth'],
  },

  // Email
  {
    key: 'sendgrid', category: 'email', provider: 'sendgrid', label: 'SendGrid', icon: Mail, tint: 'bg-blue-500',
    description: 'Transactional email — invoices, reminders, password resets',
    baseUrl: 'https://api.sendgrid.com/v3', authType: 'bearer',
    credentialFields: [
      { name: 'token', label: 'API Key', secret: true },
      { name: 'fromEmail', label: 'From email', placeholder: 'noreply@hospital.com' },
      { name: 'fromName', label: 'From name' },
    ],
    defaultModules: ['billing', 'auth', 'appointments'],
  },
  {
    key: 'smtp', category: 'email', provider: 'smtp', label: 'SMTP server', icon: Mail, tint: 'bg-blue-700',
    description: 'Generic SMTP (Office 365, AWS SES, custom)',
    baseUrl: 'smtps://smtp.example.com:465', authType: 'basic',
    credentialFields: [
      { name: 'username', label: 'Username' },
      { name: 'password', label: 'Password', secret: true },
      { name: 'fromEmail', label: 'From email' },
    ],
    defaultModules: ['billing', 'auth'],
  },

  // Payment
  {
    key: 'razorpay', category: 'payment', provider: 'razorpay', label: 'Razorpay', icon: CreditCard, tint: 'bg-indigo-600',
    description: 'India payment gateway — UPI, cards, netbanking, wallets',
    baseUrl: 'https://api.razorpay.com/v1', authType: 'basic',
    credentialFields: [
      { name: 'username', label: 'Key ID', placeholder: 'rzp_live_...' },
      { name: 'password', label: 'Key Secret', secret: true },
      { name: 'webhookSecret', label: 'Webhook secret', secret: true },
    ],
    defaultModules: ['billing'],
  },

  // Telemedicine
  {
    key: 'zoom', category: 'telemed', provider: 'zoom', label: 'Zoom', icon: Video, tint: 'bg-blue-600',
    description: 'Server-to-Server OAuth for telemedicine meetings',
    baseUrl: 'https://api.zoom.us/v2', authType: 'oauth2',
    credentialFields: [
      { name: 'accountId', label: 'Account ID' },
      { name: 'clientId', label: 'Client ID' },
      { name: 'clientSecret', label: 'Client Secret', secret: true },
    ],
    defaultModules: ['video-conversation', 'opd'],
  },
  {
    key: 'teams', category: 'telemed', provider: 'teams', label: 'Microsoft Teams', icon: Video, tint: 'bg-purple-600',
    description: 'Online meetings via Graph API',
    baseUrl: 'https://graph.microsoft.com/v1.0', authType: 'oauth2',
    credentialFields: [
      { name: 'tenantId', label: 'Tenant ID' },
      { name: 'clientId', label: 'Client ID' },
      { name: 'clientSecret', label: 'Client Secret', secret: true },
    ],
    defaultModules: ['video-conversation'],
  },

  // Accounting
  {
    key: 'accubook', category: 'accounting', provider: 'accubook', label: 'AccuBook', icon: Calculator, tint: 'bg-yellow-600',
    description: 'Sister double-entry accounting system',
    baseUrl: 'https://accubook.example.com/api', authType: 'bearer',
    credentialFields: [
      { name: 'token', label: 'API Token', secret: true },
      { name: 'organizationId', label: 'Organization ID' },
    ],
    defaultModules: ['billing', 'tally'],
  },

  // DICOM / PACS
  {
    key: 'orthanc', category: 'dicom', provider: 'orthanc', label: 'Orthanc PACS', icon: ImageIcon, tint: 'bg-purple-700',
    description: 'DICOMweb-compliant image archive (open source)',
    baseUrl: 'http://orthanc.local:8042', authType: 'basic',
    credentialFields: [
      { name: 'username', label: 'Username' },
      { name: 'password', label: 'Password', secret: true },
    ],
    defaultModules: ['radiology', 'dicom-pacs'],
  },

  // Lab analyzer middleware
  {
    key: 'mirth', category: 'lab_analyzer', provider: 'mirth', label: 'Mirth Connect', icon: TestTube, tint: 'bg-cyan-600',
    description: 'HL7 v2 / ASTM gateway for lab analyzers',
    baseUrl: 'http://mirth.local:8080/api', authType: 'basic',
    credentialFields: [
      { name: 'username', label: 'Username' },
      { name: 'password', label: 'Password', secret: true },
    ],
    defaultModules: ['laboratory', 'medical-device'],
  },

  // Insurance / TPA (placeholder — wide variety in India)
  {
    key: 'tpa', category: 'insurance', provider: 'generic_tpa', label: 'TPA / Insurance API', icon: HeartPulse, tint: 'bg-rose-500',
    description: 'Generic TPA pre-authorization + claim API',
    authType: 'bearer',
    credentialFields: [
      { name: 'token', label: 'API Token', secret: true },
      { name: 'partnerId', label: 'Partner ID' },
    ],
    defaultModules: ['tpa', 'billing'],
  },

  // Custom — for everything else
  {
    key: 'custom', category: 'custom', provider: 'custom', label: 'Custom API', icon: Cog, tint: 'bg-slate-600',
    description: 'Any other REST endpoint — fully configurable',
    authType: 'api_key',
    credentialFields: [
      { name: 'apiKey', label: 'API Key', secret: true },
      { name: 'headerName', label: 'Header name', placeholder: 'X-API-Key' },
      { name: 'headerValue', label: 'Header value', secret: true },
    ],
  },
];

const MODULE_OPTIONS = [
  'appointments', 'auth', 'opd', 'ipd', 'emergency', 'icu', 'operation-theatre',
  'laboratory', 'radiology', 'pharmacy', 'blood-bank',
  'billing', 'tally', 'tpa', 'doctor-accounting',
  'video-conversation', 'dicom-pacs', 'medical-device',
  'biometric-attendance', 'hr', 'payroll', 'master-data',
];

const CATEGORIES = [
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'payment', label: 'Payment', icon: CreditCard },
  { value: 'telemed', label: 'Telemedicine', icon: Video },
  { value: 'accounting', label: 'Accounting', icon: Calculator },
  { value: 'dicom', label: 'DICOM/PACS', icon: ImageIcon },
  { value: 'lab_analyzer', label: 'Lab analyzer', icon: TestTube },
  { value: 'insurance', label: 'Insurance/TPA', icon: HeartPulse },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'custom', label: 'Custom', icon: Cog },
];

export default function IntegrationsPanel() {
  const [list, setList] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [presetPickerOpen, setPresetPickerOpen] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [activePreset, setActivePreset] = useState<Preset | null>(null);
  const [form, setForm] = useState<Partial<Integration>>({});
  const [credInputs, setCredInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/api/admin/integrations');
      setList(r.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  function startNew(preset: Preset) {
    setActivePreset(preset);
    setForm({
      name: preset.key === 'custom' ? '' : preset.label,
      category: preset.category,
      provider: preset.provider,
      baseUrl: preset.baseUrl || '',
      authType: preset.authType,
      targetModules: preset.defaultModules || [],
      enabled: true,
      notes: '',
    });
    setCredInputs({});
    setEditing(null);
    setPresetPickerOpen(false);
    setDialogOpen(true);
  }

  function startEdit(i: Integration) {
    const preset = PRESETS.find((p) => p.provider === i.provider) || PRESETS.find((p) => p.key === 'custom')!;
    setActivePreset(preset);
    setForm({
      name: i.name,
      category: i.category,
      provider: i.provider,
      baseUrl: i.baseUrl || '',
      webUrl: i.webUrl || '',
      authType: i.authType,
      targetModules: i.targetModules,
      enabled: i.enabled,
      notes: i.notes || '',
    });
    setCredInputs({});
    setEditing(i);
    setDialogOpen(true);
  }

  function toggleModule(m: string) {
    const current = form.targetModules || [];
    const next = current.includes(m) ? current.filter((x) => x !== m) : [...current, m];
    setForm({ ...form, targetModules: next });
  }

  async function save() {
    if (!form.name || !form.category || !form.provider) {
      alert('Name, category, and provider are required');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        // Only send credentials the user actually typed; server merges
        // with existing so they don't have to re-enter every field.
        credentials: Object.keys(credInputs).length > 0 ? credInputs : undefined,
      };
      if (editing) {
        await api.put(`/api/admin/integrations/${editing.id}`, payload);
      } else {
        await api.post('/api/admin/integrations', payload);
      }
      setDialogOpen(false);
      void load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(i: Integration) {
    if (!confirm(`Delete integration "${i.name}"? Modules using it will fall back to no-provider behavior.`)) return;
    try {
      await api.delete(`/api/admin/integrations/${i.id}`);
      void load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Delete failed');
    }
  }

  async function toggleEnabled(i: Integration) {
    try {
      await api.put(`/api/admin/integrations/${i.id}`, { enabled: !i.enabled });
      void load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Update failed');
    }
  }

  async function testConnection(i: Integration) {
    setTesting(i.id);
    try {
      const r = await api.post(`/api/admin/integrations/${i.id}/test`);
      const d = r.data;
      alert(d.ok ? `✓ Connection OK\n${d.result}\n→ ${d.url}` : `✗ Test failed\n${d.result}\n→ ${d.url}`);
      void load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Test failed');
    } finally {
      setTesting(null);
    }
  }

  // Group integrations by category for display
  const byCategory: Record<string, Integration[]> = {};
  for (const i of list) {
    (byCategory[i.category] = byCategory[i.category] || []).push(i);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Plug className="w-4 h-4 text-blue-600" /> Third-party API integrations
            </CardTitle>
            <CardDescription>
              Connect external services — SMS, email, payment, telemedicine, accounting, PACS, lab
              analyzers, custom REST endpoints. Each integration can be bound to one or more modules.
              Credentials are stored encrypted at rest and never echoed back to the client in plain text.
            </CardDescription>
          </div>
          <Button onClick={() => setPresetPickerOpen(true)} className="gap-1">
            <Plus className="w-4 h-4" /> New integration
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-sm text-slate-500 py-6">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-8">
              No integrations yet. Click "New integration" to add one.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(byCategory).map(([category, items]) => {
                const meta = CATEGORIES.find((c) => c.value === category);
                const Icon = meta?.icon || Cog;
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-slate-600" />
                      <div className="font-semibold text-sm capitalize">
                        {meta?.label || category} <span className="text-slate-400">({items.length})</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {items.map((i) => (
                        <div key={i.id} className="border rounded-lg p-3 flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-md flex items-center justify-center ${i.enabled ? 'bg-blue-100' : 'bg-slate-100'}`}>
                            <Plug className={`w-4 h-4 ${i.enabled ? 'text-blue-700' : 'text-slate-400'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                              {i.name}
                              <Badge variant="outline" className="text-xs">{i.provider}</Badge>
                              {!i.enabled && <Badge variant="outline" className="bg-slate-100">Disabled</Badge>}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{i.baseUrl || 'No baseUrl'}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {i.targetModules.length === 0 ? (
                                <span className="text-xs text-slate-400 italic">No modules bound</span>
                              ) : (
                                i.targetModules.map((m) => (
                                  <Badge key={m} variant="outline" className="text-[10px] py-0">{m}</Badge>
                                ))
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              {i.lastTestStatus === 'ok' && (
                                <span className="text-emerald-700 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> {i.lastTestResult}
                                </span>
                              )}
                              {i.lastTestStatus === 'failed' && (
                                <span className="text-red-700 flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> {i.lastTestResult}
                                </span>
                              )}
                              {i.lastTestStatus === 'never' && (
                                <span className="text-slate-400">Not tested yet</span>
                              )}
                              {i.lastTestedAt && (
                                <span className="text-slate-400">· {new Date(i.lastTestedAt).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => testConnection(i)} disabled={testing === i.id} title="Test connection">
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => toggleEnabled(i)} title={i.enabled ? 'Disable' : 'Enable'}>
                              <Power className={`w-4 h-4 ${i.enabled ? 'text-emerald-600' : 'text-slate-400'}`} />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => startEdit(i)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => remove(i)} className="text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preset picker */}
      <Dialog open={presetPickerOpen} onOpenChange={setPresetPickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Pick a provider</DialogTitle>
            <DialogDescription>
              Choose a preset to fast-fill credentials and defaults. Pick "Custom API" if your provider isn't listed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.key}
                  onClick={() => startNew(p)}
                  className="border rounded-lg p-3 text-left hover:border-blue-400 hover:shadow-md transition"
                >
                  <div className={`w-9 h-9 rounded-md ${p.tint} flex items-center justify-center mb-2`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="font-semibold text-slate-900">{p.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{p.description}</div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit — ${editing.name}` : `New ${activePreset?.label || 'integration'}`}
            </DialogTitle>
            <DialogDescription>
              {activePreset?.description || 'Configure the connection details.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label className="text-xs text-slate-500">Display name *</Label>
              <Input
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Production SMS via MSG91"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Provider *</Label>
              <Input
                value={form.provider || ''}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                placeholder="msg91, twilio, sendgrid, custom..."
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">API base URL</Label>
              <Input
                value={form.baseUrl || ''}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="https://api.example.com/v1"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Web UI URL <span className="text-slate-400">(optional)</span></Label>
              <Input
                value={form.webUrl || ''}
                onChange={(e) => setForm({ ...form, webUrl: e.target.value })}
                placeholder="https://accubook.example.com"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                User-facing URL of the third-party UI. Module pages render this in an iframe + Launch button.
              </p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Auth type</Label>
              <Select value={form.authType} onValueChange={(v) => setForm({ ...form, authType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="bearer">Bearer token</SelectItem>
                  <SelectItem value="basic">HTTP Basic</SelectItem>
                  <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                  <SelectItem value="none">No auth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Status</Label>
              <Select value={form.enabled ? 'enabled' : 'disabled'} onValueChange={(v) => setForm({ ...form, enabled: v === 'enabled' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Credentials — preset-driven labels */}
          <div className="border-t pt-3">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Credentials</div>
            {(activePreset?.credentialFields || [
              { name: 'apiKey', label: 'API Key', secret: true },
            ]).map((f) => (
              <div key={f.name} className="mb-2">
                <Label className="text-xs text-slate-500">{f.label}</Label>
                <Input
                  type={f.secret ? 'password' : 'text'}
                  value={credInputs[f.name] || ''}
                  onChange={(e) => setCredInputs({ ...credInputs, [f.name]: e.target.value })}
                  placeholder={f.placeholder || (editing && (editing.credentials?.[f.name] === 'set') ? '••••• (already set — leave blank to keep)' : '')}
                />
              </div>
            ))}
            <p className="text-[11px] text-slate-500 italic mt-1">
              Leave blank to keep existing values. Server never echoes secrets back — they're shown as
              "set" / "unset" only.
            </p>
          </div>

          {/* Module bindings */}
          <div className="border-t pt-3">
            <Label className="text-sm font-semibold">
              Bind to modules ({(form.targetModules || []).length})
            </Label>
            <p className="text-xs text-slate-500 mb-2">
              Pick which HospitalPro modules should use this integration at runtime. One integration
              can power multiple modules.
            </p>
            <div className="flex flex-wrap gap-1">
              {MODULE_OPTIONS.map((m) => {
                const on = (form.targetModules || []).includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleModule(m)}
                    className={`text-xs px-2 py-1 rounded border ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-3">
            <Label className="text-xs text-slate-500">Notes</Label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Internal notes — vendor contact, contract end date, etc."
              className="w-full min-h-[60px] p-2 border rounded text-sm"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save integration'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
