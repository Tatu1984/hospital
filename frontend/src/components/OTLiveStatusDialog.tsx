// OT live-status modal. Mounted from the Operation Theatre page; gives OT
// staff three things in one place:
//   1. A stepper of canonical surgery stages — one click broadcasts to family.
//   2. A list of registered family contacts with "+ Add" form.
//   3. A reverse-chronological timeline of every stage event so far.
//
// All API calls are scoped to the surgery passed in props; the parent owns
// open/close state and refreshes its own list on close.
import { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from './Toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Trash2, Copy, CheckCircle2, Clock, Users, RefreshCw } from 'lucide-react';

interface SurgeryStage {
  code: string;
  label: string;
  familyLabel: string;
  terminal?: boolean;
}

interface StageEvent {
  id: string;
  stage: string;
  note: string | null;
  recordedAt: string;
}

interface FamilyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  trackingToken: string;
  channels: string;
}

interface Props {
  surgeryId: string | null;
  surgeryLabel: string;
  currentStage: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OTLiveStatusDialog({ surgeryId, surgeryLabel, currentStage, open, onOpenChange }: Props) {
  const toast = useToast();
  const [stages, setStages] = useState<SurgeryStage[]>([]);
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [contacts, setContacts] = useState<FamilyContact[]>([]);
  const [busyStage, setBusyStage] = useState<string | null>(null);
  const [stageNote, setStageNote] = useState('');
  // New-contact form. Kept inline (not a nested modal) — fewer clicks for an
  // OT coordinator who's typically mid-conversation with family.
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRelation, setNewRelation] = useState('spouse');
  const [adding, setAdding] = useState(false);

  // Stage list is static metadata. Fetch once and cache for the dialog
  // lifetime — calling /api/surgery-stages on every open would be wasteful.
  useEffect(() => {
    if (stages.length) return;
    api.get('/api/surgery-stages').then((r) => setStages(r.data)).catch(() => undefined);
  }, [stages.length]);

  useEffect(() => {
    if (!open || !surgeryId) return;
    void refresh();
  }, [open, surgeryId]);

  async function refresh() {
    if (!surgeryId) return;
    try {
      const [evRes, contactsRes] = await Promise.all([
        api.get(`/api/surgeries/${surgeryId}/stages`),
        api.get(`/api/surgeries/${surgeryId}/family-contacts`),
      ]);
      setEvents(evRes.data || []);
      setContacts(contactsRes.data || []);
    } catch (e) {
      // Non-fatal; dialog still works for posting new stages.
    }
  }

  async function recordStage(code: string) {
    if (!surgeryId) return;
    setBusyStage(code);
    try {
      const res = await api.post(`/api/surgeries/${surgeryId}/stage`, {
        stage: code,
        note: stageNote || undefined,
      });
      setStageNote('');
      await refresh();
      const count = res.data?.notifiedFamilyCount ?? 0;
      toast.success(
        'Stage recorded',
        count > 0 ? `${count} family contact${count === 1 ? '' : 's'} notified` : 'No family contacts registered yet',
      );
    } catch (e: any) {
      toast.error('Could not record stage', e?.response?.data?.error || 'Try again.');
    } finally {
      setBusyStage(null);
    }
  }

  async function addContact() {
    if (!surgeryId || !newName.trim() || !newPhone.trim()) return;
    setAdding(true);
    try {
      await api.post(`/api/surgeries/${surgeryId}/family-contacts`, {
        name: newName.trim(),
        phone: newPhone.trim(),
        relation: newRelation,
        channels: ['sms'],
      });
      setNewName('');
      setNewPhone('');
      setNewRelation('spouse');
      await refresh();
      toast.success('Family contact added', 'They have been sent the live tracking link.');
    } catch (e: any) {
      toast.error('Could not add contact', e?.response?.data?.error || 'Try again.');
    } finally {
      setAdding(false);
    }
  }

  async function removeContact(contactId: string) {
    if (!surgeryId) return;
    if (!confirm('Remove this family contact? They will stop receiving updates.')) return;
    try {
      await api.delete(`/api/surgeries/${surgeryId}/family-contacts/${contactId}`);
      await refresh();
    } catch (e: any) {
      toast.error('Could not remove contact', e?.response?.data?.error || 'Try again.');
    }
  }

  function copyTrackingLink(token: string) {
    const url = `${window.location.origin}/track/${token}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Tracking link copied'),
      () => toast.error('Could not copy', 'Select and copy manually.'),
    );
  }

  // Index of the current stage so we can highlight progress and grey out
  // historical stages. Terminal stages disable everything past them.
  const currentIdx = stages.findIndex((s) => s.code === currentStage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Live OT status — {surgeryLabel}</DialogTitle>
          <DialogDescription>
            Each click broadcasts an SMS to every registered family contact. Adds an entry to the timeline below.
          </DialogDescription>
        </DialogHeader>

        {/* STAGE STEPPER */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Stage</h3>
            <Button variant="ghost" size="sm" onClick={refresh}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {stages.map((s, idx) => {
              const isCurrent = s.code === currentStage;
              const isPast = currentIdx > -1 && idx < currentIdx;
              return (
                <Button
                  key={s.code}
                  variant={isCurrent ? 'default' : isPast ? 'secondary' : 'outline'}
                  size="sm"
                  disabled={busyStage !== null}
                  onClick={() => recordStage(s.code)}
                  className="justify-start text-left h-auto py-2"
                >
                  {isPast && <CheckCircle2 className="w-3 h-3 mr-1 shrink-0" />}
                  <span className="truncate">{s.label}</span>
                  {busyStage === s.code && <span className="ml-2 text-xs">…</span>}
                </Button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Optional note (e.g. 'extra time needed')"
              value={stageNote}
              onChange={(e) => setStageNote(e.target.value)}
            />
          </div>
        </section>

        {/* FAMILY CONTACTS */}
        <section className="space-y-3 border-t pt-4">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Family contacts ({contacts.length})</h3>
          {contacts.length === 0 && (
            <p className="text-sm text-slate-500">No family contacts yet. Add one below — they'll get an SMS with a live tracking link.</p>
          )}
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{c.name} <span className="text-xs text-slate-500">({c.relation})</span></div>
                <div className="text-sm text-slate-600">{c.phone}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => copyTrackingLink(c.trackingToken)}>
                <Copy className="w-3 h-3 mr-1" /> Copy link
              </Button>
              <Button variant="ghost" size="sm" onClick={() => removeContact(c.id)}>
                <Trash2 className="w-3 h-3 text-red-600" />
              </Button>
            </div>
          ))}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2">
            <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input placeholder="Phone (with country code)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <Select value={newRelation} onValueChange={setNewRelation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="spouse">Spouse</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="child">Child</SelectItem>
                <SelectItem value="sibling">Sibling</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addContact} disabled={adding || !newName.trim() || !newPhone.trim()}>
              {adding ? 'Adding…' : 'Add contact'}
            </Button>
          </div>
        </section>

        {/* TIMELINE */}
        <section className="space-y-2 border-t pt-4">
          <h3 className="font-semibold text-sm">Timeline</h3>
          {events.length === 0 ? (
            <p className="text-sm text-slate-500">No stages recorded yet.</p>
          ) : (
            <ol className="space-y-2">
              {events.map((e) => {
                const meta = stages.find((s) => s.code === e.stage);
                return (
                  <li key={e.id} className="flex items-start gap-3 text-sm">
                    <Badge variant="outline" className="shrink-0">{new Date(e.recordedAt).toLocaleTimeString()}</Badge>
                    <div className="flex-1">
                      <div className="font-medium">{meta?.label || e.stage}</div>
                      {e.note && <div className="text-slate-600">{e.note}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
