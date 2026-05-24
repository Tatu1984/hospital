// Lab Configuration — master-data screen for lab test catalog and the
// reportable parameters within each test. Mounted as a "Configuration"
// tab inside the Laboratory page.
//
// Two-pane layout:
//   • Left: list of all lab tests (search, filter by category)
//   • Right: detail view of the selected test — master fields + a
//     parameter list with inline add/edit/delete
//
// Each parameter has: name, unit, reference low/high, critical low/high,
// decimals, display order. A panel test like CBC has 8-15 parameters;
// a simple test like Random Blood Sugar has just one.

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Settings2,
  Pencil,
  Trash2,
  Save,
  X,
  TestTube,
  Cog,
} from 'lucide-react';
import api from '../services/api';

interface LabTest {
  id: string;
  name: string;
  code: string;
  category: string;
  price: number | string;
  tat: number;
  unit: string | null;
  normalRange: string | null;
  sampleType: string | null;
  methodology: string | null;
  isActive: boolean;
  parameters?: LabParameter[];
}

// One stratified reference range. Sex 'any' applies to both; age limits
// are inclusive years. A "Child" rule is just an entry with maxAgeYears
// set (sex usually 'any'). An "Adult Male" rule has minAgeYears 18 and
// sex 'M'. The simple refLow/refHigh on the parameter act as the default
// when no rule matches the patient.
interface AgeGenderRange {
  sex: 'M' | 'F' | 'any';
  minAgeYears: number | null;
  maxAgeYears: number | null;
  low: number | null;
  high: number | null;
  label?: string;   // optional display name e.g. "Newborn", "Adolescent"
}

interface LabParameter {
  id: string;
  testId: string;
  name: string;
  code: string | null;
  unit: string | null;
  resultType: 'numeric' | 'text' | 'qualitative';
  refLow: number | string | null;
  refHigh: number | string | null;
  criticalLow: number | string | null;
  criticalHigh: number | string | null;
  decimals: number;
  choices: string[] | null;
  ageGenderRanges: AgeGenderRange[] | null;
  displayOrder: number;
  isActive: boolean;
}

const EMPTY_PARAM: Omit<LabParameter, 'id' | 'testId'> = {
  name: '',
  code: null,
  unit: null,
  resultType: 'numeric',
  refLow: null,
  refHigh: null,
  criticalLow: null,
  criticalHigh: null,
  decimals: 2,
  choices: null,
  ageGenderRanges: null,
  displayOrder: 0,
  isActive: true,
};

export default function LabConfiguration() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Test detail / parameter editing state.
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [parameters, setParameters] = useState<LabParameter[]>([]);
  const [paramDraft, setParamDraft] = useState<(Partial<LabParameter> & { id?: string }) | null>(null);
  const [savingParam, setSavingParam] = useState(false);

  // New-test dialog.
  const [newTestOpen, setNewTestOpen] = useState(false);
  const [newTestForm, setNewTestForm] = useState<Partial<LabTest>>({
    name: '', code: '', category: '', price: 0, tat: 24, sampleType: '', methodology: '', isActive: true,
  });

  async function loadTests() {
    try {
      setLoading(true);
      const r = await api.get('/api/lab-tests', { params: search ? { search } : {} });
      setTests(r.data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load lab tests');
    } finally {
      setLoading(false);
    }
  }

  async function loadParameters(testId: string) {
    try {
      const r = await api.get(`/api/lab-tests/${testId}/parameters`);
      setParameters(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load parameters');
    }
  }

  useEffect(() => { void loadTests(); }, []); // initial
  useEffect(() => {
    if (selectedTest) void loadParameters(selectedTest.id);
    else setParameters([]);
  }, [selectedTest?.id]);

  // Use localeCompare so the comparator is well-defined across locales —
  // Sonar (correctly) flags the bare .sort() default on strings as
  // implementation-dependent.
  const categories = Array.from(new Set(tests.map((t) => t.category)))
    .sort((a, b) => a.localeCompare(b));
  const filteredTests = tests.filter((t) => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);
  });

  async function createTest() {
    try {
      const r = await api.post('/api/lab-tests', {
        ...newTestForm,
        price: Number(newTestForm.price || 0),
        tat: Number(newTestForm.tat || 24),
      });
      setTests((prev) => [r.data, ...prev]);
      setNewTestOpen(false);
      setNewTestForm({ name: '', code: '', category: '', price: 0, tat: 24, sampleType: '', methodology: '', isActive: true });
      setSelectedTest(r.data);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to create test');
    }
  }

  async function updateTestField<K extends keyof LabTest>(field: K, value: LabTest[K]) {
    if (!selectedTest) return;
    const updated = { ...selectedTest, [field]: value };
    setSelectedTest(updated);
    try {
      const r = await api.put(`/api/lab-tests/${selectedTest.id}`, updated);
      setTests((prev) => prev.map((t) => (t.id === r.data.id ? r.data : t)));
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to save change');
    }
  }

  function startNewParam() {
    setParamDraft({ ...EMPTY_PARAM, displayOrder: parameters.length });
  }
  function startEditParam(p: LabParameter) {
    setParamDraft({ ...p });
  }
  function cancelParamEdit() {
    setParamDraft(null);
  }

  async function saveParam() {
    if (!selectedTest || !paramDraft) return;
    if (!paramDraft.name?.trim()) {
      alert('Parameter name is required');
      return;
    }
    setSavingParam(true);
    try {
      if (paramDraft.id) {
        const r = await api.put(`/api/lab-test-parameters/${paramDraft.id}`, paramDraft);
        setParameters((prev) => prev.map((p) => (p.id === r.data.id ? r.data : p)));
      } else {
        const r = await api.post(`/api/lab-tests/${selectedTest.id}/parameters`, paramDraft);
        setParameters((prev) => [...prev, r.data]);
      }
      setParamDraft(null);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to save parameter');
    } finally {
      setSavingParam(false);
    }
  }

  async function deleteParam(p: LabParameter) {
    if (!confirm(`Delete parameter "${p.name}"?`)) return;
    try {
      await api.delete(`/api/lab-test-parameters/${p.id}`);
      setParameters((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to delete');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-50 ring-1 ring-pink-100 flex items-center justify-center">
            <Cog className="w-6 h-6 text-pink-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Lab Configuration</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage the test catalog and reportable parameters</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* LEFT — test catalog */}
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TestTube className="w-4 h-4 text-cyan-600" /> Test catalog ({tests.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by test name or code"
                className="pl-9"
              />
            </div>
            <Button onClick={() => setNewTestOpen(true)} className="gap-1">
              <Plus className="w-4 h-4" /> New test
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && <p className="text-sm text-slate-500 py-4 text-center">Loading…</p>}
          {error && <p className="text-sm text-red-600 py-2">{error}</p>}

          <div className="border rounded-md max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-sm text-slate-500">
                      No tests match
                    </TableCell>
                  </TableRow>
                ) : filteredTests.map((t) => (
                  <TableRow
                    key={t.id}
                    className={`cursor-pointer ${selectedTest?.id === t.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedTest(t)}
                  >
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell><Badge variant="outline">{t.code}</Badge></TableCell>
                    <TableCell className="text-xs text-slate-600">{t.category}</TableCell>
                    <TableCell className="text-right">₹{Number(t.price).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* RIGHT — selected test detail */}
      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-purple-600" />
            {selectedTest ? `${selectedTest.name} — configuration` : 'Select a test to configure'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedTest && (
            <p className="text-sm text-slate-500 py-12 text-center">
              Pick a test from the catalog on the left to edit its master fields and report parameters.
            </p>
          )}
          {selectedTest && (
            <div className="space-y-5">
              {/* Master fields */}
              <div className="grid grid-cols-2 gap-3">
                <FieldEdit label="Name" value={selectedTest.name} onSave={(v) => updateTestField('name', v)} />
                <FieldEdit label="Code" value={selectedTest.code} onSave={(v) => updateTestField('code', v)} />
                <FieldEdit label="Category" value={selectedTest.category} onSave={(v) => updateTestField('category', v)} />
                <FieldEdit
                  label="Price (₹)"
                  value={String(selectedTest.price)}
                  onSave={(v) => updateTestField('price', Number(v) as any)}
                  numeric
                />
                <FieldEdit
                  label="TAT (hours)"
                  value={String(selectedTest.tat)}
                  onSave={(v) => updateTestField('tat', Number(v) as any)}
                  numeric
                />
                <FieldEdit
                  label="Sample type"
                  value={selectedTest.sampleType || ''}
                  onSave={(v) => updateTestField('sampleType', v || null as any)}
                  placeholder="e.g. Whole blood (EDTA)"
                />
                <FieldEdit
                  label="Methodology"
                  value={selectedTest.methodology || ''}
                  onSave={(v) => updateTestField('methodology', v || null as any)}
                  placeholder="e.g. Photometric, ELISA"
                />
              </div>

              {/* Parameters */}
              <div className="border rounded-md">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b">
                  <div className="text-sm font-semibold text-slate-700">
                    Report parameters ({parameters.length})
                  </div>
                  <Button size="sm" onClick={startNewParam} disabled={!!paramDraft} className="gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add parameter
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Ref range</TableHead>
                      <TableHead>Critical</TableHead>
                      <TableHead className="text-right w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parameters.length === 0 && !paramDraft && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-sm text-slate-500">
                          No parameters configured. Click "Add parameter".
                        </TableCell>
                      </TableRow>
                    )}
                    {parameters.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs text-slate-400">{p.displayOrder + 1}</TableCell>
                        <TableCell className="font-medium">
                          {p.name}{p.code && <span className="text-xs text-slate-400 ml-2">({p.code})</span>}
                        </TableCell>
                        <TableCell>{p.unit || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{p.resultType}</Badge></TableCell>
                        <TableCell>
                          {p.refLow !== null || p.refHigh !== null
                            ? `${p.refLow ?? '−∞'} – ${p.refHigh ?? '+∞'}`
                            : '—'}
                          {p.ageGenderRanges && p.ageGenderRanges.length > 0 && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                              +{p.ageGenderRanges.length} stratified
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.criticalLow !== null || p.criticalHigh !== null
                            ? `${p.criticalLow ?? '−∞'} / ${p.criticalHigh ?? '+∞'}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => startEditParam(p)} className="h-7 w-7 p-0">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteParam(p)} className="h-7 w-7 p-0 text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New test dialog */}
      <Dialog open={newTestOpen} onOpenChange={setNewTestOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New lab test</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name *</Label>
              <Input value={newTestForm.name || ''} onChange={(e) => setNewTestForm({ ...newTestForm, name: e.target.value })} placeholder="e.g. Complete Blood Count" />
            </div>
            <div>
              <Label>Code *</Label>
              <Input value={newTestForm.code || ''} onChange={(e) => setNewTestForm({ ...newTestForm, code: e.target.value })} placeholder="e.g. CBC" />
            </div>
            <div>
              <Label>Category *</Label>
              <Input value={newTestForm.category || ''} onChange={(e) => setNewTestForm({ ...newTestForm, category: e.target.value })} placeholder="e.g. Hematology" />
            </div>
            <div>
              <Label>Price (₹)</Label>
              <Input type="number" value={String(newTestForm.price ?? 0)} onChange={(e) => setNewTestForm({ ...newTestForm, price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>TAT (hours)</Label>
              <Input type="number" value={String(newTestForm.tat ?? 24)} onChange={(e) => setNewTestForm({ ...newTestForm, tat: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Sample type</Label>
              <Input value={newTestForm.sampleType || ''} onChange={(e) => setNewTestForm({ ...newTestForm, sampleType: e.target.value })} placeholder="e.g. EDTA whole blood" />
            </div>
            <div>
              <Label>Methodology</Label>
              <Input value={newTestForm.methodology || ''} onChange={(e) => setNewTestForm({ ...newTestForm, methodology: e.target.value })} placeholder="e.g. Photometric" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTestOpen(false)}>Cancel</Button>
            <Button onClick={createTest} disabled={!newTestForm.name || !newTestForm.code || !newTestForm.category}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Parameter add/edit dialog */}
      <Dialog open={!!paramDraft} onOpenChange={(o) => !o && cancelParamEdit()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{paramDraft?.id ? 'Edit parameter' : 'New parameter'}</DialogTitle>
          </DialogHeader>
          {paramDraft && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Parameter name *</Label>
                <Input value={paramDraft.name || ''} onChange={(e) => setParamDraft({ ...paramDraft, name: e.target.value })} placeholder="e.g. Hemoglobin" />
              </div>
              <div>
                <Label>Code (short)</Label>
                <Input value={paramDraft.code || ''} onChange={(e) => setParamDraft({ ...paramDraft, code: e.target.value })} placeholder="e.g. HGB" />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={paramDraft.unit || ''} onChange={(e) => setParamDraft({ ...paramDraft, unit: e.target.value })} placeholder="e.g. g/dL" />
              </div>
              <div>
                <Label>Result type</Label>
                <Select
                  value={paramDraft.resultType || 'numeric'}
                  onValueChange={(v) => setParamDraft({ ...paramDraft, resultType: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="numeric">Numeric</SelectItem>
                    <SelectItem value="text">Free text</SelectItem>
                    <SelectItem value="qualitative">Qualitative (choices)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Decimals</Label>
                <Input type="number" min={0} max={6} value={paramDraft.decimals ?? 2} onChange={(e) => setParamDraft({ ...paramDraft, decimals: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Reference low</Label>
                <Input type="number" step="any" value={paramDraft.refLow as any ?? ''} onChange={(e) => setParamDraft({ ...paramDraft, refLow: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div>
                <Label>Reference high</Label>
                <Input type="number" step="any" value={paramDraft.refHigh as any ?? ''} onChange={(e) => setParamDraft({ ...paramDraft, refHigh: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div>
                <Label>Critical low</Label>
                <Input type="number" step="any" value={paramDraft.criticalLow as any ?? ''} onChange={(e) => setParamDraft({ ...paramDraft, criticalLow: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div>
                <Label>Critical high</Label>
                <Input type="number" step="any" value={paramDraft.criticalHigh as any ?? ''} onChange={(e) => setParamDraft({ ...paramDraft, criticalHigh: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div>
                <Label>Display order</Label>
                <Input type="number" value={paramDraft.displayOrder ?? 0} onChange={(e) => setParamDraft({ ...paramDraft, displayOrder: Number(e.target.value) })} />
              </div>
              {paramDraft.resultType === 'qualitative' && (
                <div className="col-span-2">
                  <Label>Choices (comma-separated)</Label>
                  <Input
                    value={(paramDraft.choices || []).join(', ')}
                    onChange={(e) => setParamDraft({
                      ...paramDraft,
                      choices: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })}
                    placeholder="Positive, Negative, Indeterminate"
                  />
                </div>
              )}

              {/* Sex / age stratified ranges. Each row overrides the
                  default refLow/refHigh above for patients matching its
                  sex + age window. The "Quick add" buttons drop in
                  common presets (Child / Adult Male / Adult Female). */}
              {paramDraft.resultType === 'numeric' && (
                <div className="col-span-2 border rounded-md p-3 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Label className="text-sm font-semibold">Stratified ranges by sex / age</Label>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Optional. Default reference range above is used when none of these rules match.
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant="outline"
                        onClick={() => setParamDraft({
                          ...paramDraft,
                          ageGenderRanges: [
                            ...(paramDraft.ageGenderRanges || []),
                            { sex: 'any', minAgeYears: 0, maxAgeYears: 12, low: null, high: null, label: 'Child' },
                          ],
                        })}
                      >+ Child</Button>
                      <Button type="button" size="sm" variant="outline"
                        onClick={() => setParamDraft({
                          ...paramDraft,
                          ageGenderRanges: [
                            ...(paramDraft.ageGenderRanges || []),
                            { sex: 'M', minAgeYears: 18, maxAgeYears: null, low: null, high: null, label: 'Adult Male' },
                          ],
                        })}
                      >+ Adult Male</Button>
                      <Button type="button" size="sm" variant="outline"
                        onClick={() => setParamDraft({
                          ...paramDraft,
                          ageGenderRanges: [
                            ...(paramDraft.ageGenderRanges || []),
                            { sex: 'F', minAgeYears: 18, maxAgeYears: null, low: null, high: null, label: 'Adult Female' },
                          ],
                        })}
                      >+ Adult Female</Button>
                      <Button type="button" size="sm" variant="outline"
                        onClick={() => setParamDraft({
                          ...paramDraft,
                          ageGenderRanges: [
                            ...(paramDraft.ageGenderRanges || []),
                            { sex: 'any', minAgeYears: null, maxAgeYears: null, low: null, high: null },
                          ],
                        })}
                      ><Plus className="w-3 h-3" /> Custom</Button>
                    </div>
                  </div>

                  {(paramDraft.ageGenderRanges || []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      No stratified rules. Click a "Quick add" button above to start.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Label</TableHead>
                          <TableHead className="text-xs">Sex</TableHead>
                          <TableHead className="text-xs">Min age</TableHead>
                          <TableHead className="text-xs">Max age</TableHead>
                          <TableHead className="text-xs">Low</TableHead>
                          <TableHead className="text-xs">High</TableHead>
                          <TableHead className="text-xs w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(paramDraft.ageGenderRanges || []).map((rng, i) => {
                          const update = (patch: Partial<AgeGenderRange>) => {
                            const next = [...(paramDraft.ageGenderRanges || [])];
                            next[i] = { ...rng, ...patch };
                            setParamDraft({ ...paramDraft, ageGenderRanges: next });
                          };
                          return (
                            <TableRow key={i}>
                              <TableCell>
                                <Input
                                  className="h-8 text-xs"
                                  value={rng.label || ''}
                                  onChange={(e) => update({ label: e.target.value })}
                                  placeholder="e.g. Newborn"
                                />
                              </TableCell>
                              <TableCell>
                                <Select value={rng.sex} onValueChange={(v) => update({ sex: v as any })}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="any">Any</SelectItem>
                                    <SelectItem value="M">Male</SelectItem>
                                    <SelectItem value="F">Female</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number" step="any" className="h-8 text-xs"
                                  value={rng.minAgeYears ?? ''}
                                  onChange={(e) => update({ minAgeYears: e.target.value === '' ? null : Number(e.target.value) })}
                                  placeholder="—"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number" step="any" className="h-8 text-xs"
                                  value={rng.maxAgeYears ?? ''}
                                  onChange={(e) => update({ maxAgeYears: e.target.value === '' ? null : Number(e.target.value) })}
                                  placeholder="—"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number" step="any" className="h-8 text-xs"
                                  value={rng.low ?? ''}
                                  onChange={(e) => update({ low: e.target.value === '' ? null : Number(e.target.value) })}
                                  placeholder="—"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number" step="any" className="h-8 text-xs"
                                  value={rng.high ?? ''}
                                  onChange={(e) => update({ high: e.target.value === '' ? null : Number(e.target.value) })}
                                  placeholder="—"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button" size="sm" variant="ghost"
                                  className="h-7 w-7 p-0 text-red-600"
                                  onClick={() => {
                                    const next = (paramDraft.ageGenderRanges || []).filter((_, j) => j !== i);
                                    setParamDraft({ ...paramDraft, ageGenderRanges: next.length ? next : null });
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={cancelParamEdit} disabled={savingParam} className="gap-1">
              <X className="w-4 h-4" /> Cancel
            </Button>
            <Button onClick={saveParam} disabled={savingParam} className="gap-1">
              <Save className="w-4 h-4" /> {savingParam ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

// Inline-editable text/number field. Click pencil, edit, blur or hit enter
// to save. Used for the test master record so the operator can tweak any
// field without a separate "edit master" dialog.
function FieldEdit({ label, value, onSave, numeric, placeholder }: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  numeric?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  return (
    <div>
      <Label className="text-xs text-slate-500">{label}</Label>
      {editing ? (
        <Input
          autoFocus
          type={numeric ? 'number' : 'text'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
          placeholder={placeholder}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full text-left px-3 py-2 text-sm border rounded-md hover:bg-slate-50 truncate"
          title="Click to edit"
        >
          {value || <span className="text-slate-400">{placeholder || '—'}</span>}
        </button>
      )}
    </div>
  );
}
