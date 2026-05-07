// Role Management — admin UI for the DB-backed RBAC. Lists every role
// with its permission set, lets admin create new custom roles, edit
// existing ones (including system-seeded roles' permission lists), and
// disable/delete custom roles.

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, ShieldCheck, Lock, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';

interface Role {
  id: string;
  tenantId: string | null;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PermissionEntry {
  code: string;
  group: string;
}

export default function RoleManagementPanel() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        api.get('/api/admin/roles'),
        api.get('/api/admin/permissions'),
      ]);
      setRoles(r.data);
      setPermissions(p.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  function newRole() {
    setForm({ name: '', description: '', permissions: [] });
    setEditing(null);
    setDialogOpen(true);
  }
  function editRole(r: Role) {
    setForm({ name: r.name, description: r.description || '', permissions: [...r.permissions] });
    setEditing(r);
    setDialogOpen(true);
  }
  function togglePerm(code: string) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(code)
        ? f.permissions.filter((p) => p !== code)
        : [...f.permissions, code],
    }));
  }
  function toggleGroup(group: string) {
    const groupPerms = permissions.filter((p) => p.group === group).map((p) => p.code);
    const allSelected = groupPerms.every((p) => form.permissions.includes(p));
    setForm((f) => ({
      ...f,
      permissions: allSelected
        ? f.permissions.filter((p) => !groupPerms.includes(p))
        : Array.from(new Set([...f.permissions, ...groupPerms])),
    }));
  }

  async function save() {
    if (!form.name.trim()) { alert('Role name required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/admin/roles/${editing.id}`, form);
      } else {
        await api.post('/api/admin/roles', form);
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  }
  async function remove(r: Role) {
    if (!confirm(`Delete role "${r.name}"? Users still using it must be re-assigned first.`)) return;
    try {
      await api.delete(`/api/admin/roles/${r.id}`);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.response?.data?.error || 'Delete failed');
    }
  }

  // Group permissions for the editor UI
  const groups = Array.from(new Set(permissions.map((p) => p.group))).sort();
  const filteredPerms = filter
    ? permissions.filter((p) => p.code.toLowerCase().includes(filter.toLowerCase()))
    : permissions;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> Roles & Permissions
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Edit a role's permissions or create a new custom role. Permission changes take effect
              for users on their next login (or token refresh, max 1 hour).
            </p>
          </div>
          <Button onClick={newRole} className="gap-1">
            <Plus className="w-4 h-4" /> New role
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-sm text-slate-500 py-6">Loading…</p>
          ) : (
            <div className="space-y-2">
              {roles.map((r) => (
                <div key={r.id} className="border rounded-lg p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center ${r.isSystem ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    {r.isSystem ? <Lock className="w-4 h-4 text-blue-700" /> : <ShieldCheck className="w-4 h-4 text-slate-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{r.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{r.id}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{r.description || 'No description'}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.permissions.includes('*' as any) ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">All permissions (super-admin)</Badge>
                      ) : (
                        <Badge variant="outline">{r.permissions.length} permission{r.permissions.length === 1 ? '' : 's'}</Badge>
                      )}
                      {r.isSystem && <Badge variant="outline" className="bg-blue-50 text-blue-700">System</Badge>}
                      {!r.isActive && <Badge variant="outline" className="bg-slate-100">Inactive</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => editRole(r)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                    {!r.isSystem && (
                      <Button size="sm" variant="ghost" onClick={() => remove(r)} className="text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></Button>
                    )}
                  </div>
                </div>
              ))}
              {roles.length === 0 && <p className="text-center text-sm text-slate-500 py-6">No roles yet.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit role — ${editing.name}` : 'New role'}
              {editing?.isSystem && <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700">System</Badge>}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label className="text-xs text-slate-500">Role name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Lab Manager, Senior Consultant"
                disabled={editing?.isSystem}
              />
              {editing?.isSystem && (
                <p className="text-[11px] text-slate-400 mt-1">System role names are locked.</p>
              )}
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-slate-500">Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What does this role do? Who has it?"
              />
            </div>
          </div>

          <div className="border-t pt-3 mt-2">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">
                Permissions ({form.permissions.length} of {permissions.length} selected)
              </Label>
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter…"
                className="w-48 h-8 text-sm"
              />
            </div>

            {(editing?.permissions || []).includes('*') && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800 mb-2">
                This is the super-admin role. It implicitly has every permission via the wildcard <code>*</code>.
                Editing the checklist below will REPLACE the wildcard with an explicit list.
              </div>
            )}

            <div className="space-y-3">
              {groups.map((g) => {
                const groupPerms = filteredPerms.filter((p) => p.group === g);
                if (groupPerms.length === 0) return null;
                const selectedInGroup = groupPerms.filter((p) => form.permissions.includes(p.code)).length;
                return (
                  <div key={g} className="border rounded p-2 bg-slate-50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-sm capitalize text-slate-700">
                        {g.replace(/_/g, ' ')}
                        <span className="ml-2 text-xs text-slate-500 font-normal">
                          {selectedInGroup} / {groupPerms.length}
                        </span>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => toggleGroup(g)}>
                        {selectedInGroup === groupPerms.length ? 'Clear group' : 'Select group'}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                      {groupPerms.map((p) => {
                        const checked = form.permissions.includes(p.code);
                        return (
                          <label key={p.code} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePerm(p.code)}
                              className="w-3.5 h-3.5"
                            />
                            <code className={`text-xs ${checked ? 'text-slate-900' : 'text-slate-500'}`}>{p.code}</code>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save role'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
