// Shared list-with-CRUD page for the simpler resource modules. Saves
// each module from re-implementing the table + add dialog + edit + delete
// pattern. Each module supplies a config and gets a working page.
//
// Usage:
//   <ResourceListPage
//     title="Mortuary Records"
//     description="…"
//     icon={Cross}
//     api="/api/mortuary"
//     columns={[ ... ]}
//     formFields={[ ... ]}
//   />

import { useEffect, useState, ReactNode } from 'react';
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
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import api from '../../services/api';

type FieldType = 'text' | 'number' | 'date' | 'datetime' | 'select' | 'textarea';

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  default?: any;
  span?: 1 | 2;        // grid span inside the dialog (defaults to 1)
}

export interface Column<T = any> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
  width?: string;
}

export interface ResourceListPageProps<T = any> {
  title: string;
  description?: string;
  icon?: any;
  iconTint?: string;        // tailwind bg class, e.g. 'bg-rose-500'
  api: string;              // e.g. '/api/mortuary'
  /** If set, the listing will request `?{filterKey}={filterValue}` */
  initialFilters?: Record<string, string>;
  columns: Column<T>[];
  formFields: FormField[];
  /** Customize the create/edit row id key (defaults to 'id') */
  idKey?: string;
  /** Stat tiles shown above the table; computed from the loaded rows */
  stats?: Array<{ label: string; compute: (rows: T[]) => string | number; tint?: string }>;
  /** Called after a successful create/update to allow custom side-effects */
  onChange?: () => void;
}

export default function ResourceListPage<T extends Record<string, any>>(props: ResourceListPageProps<T>) {
  const {
    title, description, icon: Icon, iconTint = 'bg-blue-500',
    api: apiPath, columns, formFields, idKey = 'id', initialFilters, stats,
  } = props;

  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get(apiPath, { params: initialFilters });
      setRows(Array.isArray(r.data) ? r.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [apiPath]);

  function openNew() {
    const init: Record<string, any> = {};
    for (const f of formFields) if (f.default !== undefined) init[f.name] = f.default;
    setForm(init);
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(row: T) {
    setForm({ ...row });
    setEditing(row);
    setDialogOpen(true);
  }
  function update(name: string, value: any) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function save() {
    // Required-field check
    for (const f of formFields) {
      if (f.required && !form[f.name] && form[f.name] !== 0) {
        alert(`${f.label} is required`);
        return;
      }
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`${apiPath}/${editing[idKey]}`, form);
      } else {
        await api.post(apiPath, form);
      }
      setDialogOpen(false);
      props.onChange?.();
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: T) {
    if (!confirm('Delete this record?')) return;
    try {
      await api.delete(`${apiPath}/${row[idKey]}`);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Delete failed');
    }
  }

  // Convert legacy iconTint (e.g. "bg-rose-500") to the new soft pastel
  // pair (bg-rose-50 ring-rose-100 text-rose-600). Static map because
  // Tailwind's JIT can't see dynamically-built class names.
  const TINT_MAP: Record<string, { bg: string; ring: string; text: string }> = {
    blue:    { bg: 'bg-blue-50',    ring: 'ring-blue-100',    text: 'text-blue-600' },
    indigo:  { bg: 'bg-indigo-50',  ring: 'ring-indigo-100',  text: 'text-indigo-600' },
    cyan:    { bg: 'bg-cyan-50',    ring: 'ring-cyan-100',    text: 'text-cyan-600' },
    sky:     { bg: 'bg-sky-50',     ring: 'ring-sky-100',     text: 'text-sky-600' },
    teal:    { bg: 'bg-teal-50',    ring: 'ring-teal-100',    text: 'text-teal-600' },
    emerald: { bg: 'bg-emerald-50', ring: 'ring-emerald-100', text: 'text-emerald-600' },
    green:   { bg: 'bg-green-50',   ring: 'ring-green-100',   text: 'text-green-700' },
    lime:    { bg: 'bg-lime-50',    ring: 'ring-lime-100',    text: 'text-lime-700' },
    yellow:  { bg: 'bg-yellow-50',  ring: 'ring-yellow-100',  text: 'text-yellow-700' },
    amber:   { bg: 'bg-amber-50',   ring: 'ring-amber-100',   text: 'text-amber-700' },
    orange:  { bg: 'bg-orange-50',  ring: 'ring-orange-100',  text: 'text-orange-600' },
    red:     { bg: 'bg-red-50',     ring: 'ring-red-100',     text: 'text-red-600' },
    rose:    { bg: 'bg-rose-50',    ring: 'ring-rose-100',    text: 'text-rose-600' },
    pink:    { bg: 'bg-pink-50',    ring: 'ring-pink-100',    text: 'text-pink-600' },
    fuchsia: { bg: 'bg-fuchsia-50', ring: 'ring-fuchsia-100', text: 'text-fuchsia-600' },
    violet:  { bg: 'bg-violet-50',  ring: 'ring-violet-100',  text: 'text-violet-600' },
    slate:   { bg: 'bg-slate-100',  ring: 'ring-slate-200',   text: 'text-slate-700' },
  };
  const tintKey = (iconTint.match(/bg-([a-z]+)-/) || [])[1] || 'slate';
  const tint = TINT_MAP[tintKey] || TINT_MAP.slate;
  const { bg: softBg, ring: softRing, text: softText } = tint;

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-full max-w-[1500px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className={`w-12 h-12 rounded-2xl ${softBg} ring-1 ${softRing} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${softText}`} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{title}</h1>
            {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} className="gap-1.5 h-10 rounded-xl">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button onClick={openNew} className="gap-1.5 h-10 px-4 rounded-xl shadow-sm bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4" /> New
          </Button>
        </div>
      </div>

      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{s.label}</div>
                <div className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight tabular-nums">{s.compute(rows)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base text-slate-900">{title} <span className="text-slate-500 font-normal text-sm">({rows.length})</span></CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-sm text-slate-500 py-8">Loading…</p>
          ) : error ? (
            <p className="text-center text-sm text-red-600 py-8">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-8">
              No records yet. Click "+ New" to add one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => (
                      <TableHead key={String(c.key)} style={{ width: c.width }}>{c.label}</TableHead>
                    ))}
                    <TableHead className="text-right w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={String(row[idKey] || i)}>
                      {columns.map((c) => (
                        <TableCell key={String(c.key)}>
                          {c.render ? c.render(row) : String(row[c.key as keyof T] ?? '—')}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(row)} className="h-7 w-7 p-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(row)} className="h-7 w-7 p-0 text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'New'} {title.replace(/s$/, '').replace(/ records?$/i, '')}</DialogTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {formFields.map((f) => {
              const colSpan = f.span === 2 ? 'col-span-2' : '';
              const value = form[f.name] ?? '';
              return (
                <div key={f.name} className={colSpan}>
                  <Label className="text-xs text-slate-500">
                    {f.label}{f.required ? ' *' : ''}
                  </Label>
                  {f.type === 'textarea' ? (
                    <textarea
                      value={value}
                      onChange={(e) => update(f.name, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full min-h-[70px] p-2 border rounded text-sm"
                    />
                  ) : f.type === 'select' ? (
                    <Select value={String(value)} onValueChange={(v) => update(f.name, v)}>
                      <SelectTrigger><SelectValue placeholder={f.placeholder || 'Select…'} /></SelectTrigger>
                      <SelectContent>
                        {(f.options || []).map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={f.type === 'datetime' ? 'datetime-local' : f.type}
                      value={value === null || value === undefined ? '' : value}
                      onChange={(e) => {
                        const raw = e.target.value;
                        update(f.name, f.type === 'number' ? (raw === '' ? null : Number(raw)) : raw);
                      }}
                      placeholder={f.placeholder}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Convenient renderers for use in `columns`
export function StatusBadge({ value }: { value: string }) {
  const map: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700',
    paid: 'bg-emerald-100 text-emerald-700',
    active: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-blue-100 text-blue-700',
    scheduled: 'bg-slate-100 text-slate-700',
    pending: 'bg-amber-100 text-amber-700',
    received: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-slate-100 text-slate-500',
    rejected: 'bg-red-100 text-red-700',
    failed: 'bg-red-100 text-red-700',
    open: 'bg-amber-100 text-amber-700',
    closed: 'bg-slate-100 text-slate-500',
    stored: 'bg-slate-100 text-slate-700',
    released: 'bg-emerald-100 text-emerald-700',
  };
  return <Badge variant="outline" className={map[value] || ''}>{value}</Badge>;
}

export function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}
