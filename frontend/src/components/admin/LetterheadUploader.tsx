// Letterhead uploader — admin-only widget for System Settings.
// Uploads an A4-proportioned image (PNG / JPG / WEBP) which the PDF
// generators paint as the full-page background on every printed report.
//
// Storage: the image is base64'd on the client, sent to PUT
// /api/tenant/letterhead, and stored in tenant.config.letterhead.
// The PDF generators consume it from the local letterheadStore cache.

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileImage, Trash2, Save } from 'lucide-react';
import api from '../../services/api';
import { setLetterhead } from '../../lib/letterheadStore';

const MAX_BYTES = 2_500_000; // ~2 MB raw — fits inside the 2.8 MB data-URL cap on the server

export default function LetterheadUploader() {
  const [current, setCurrent] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void api.get('/api/tenant/letterhead')
      .then((r) => setCurrent(r.data?.letterhead || null))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  function pickFile() { fileRef.current?.click(); }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setError(`Image too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum 2.5 MB. Compress or down-scale before uploading.`);
      return;
    }
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) {
      setError('Please pick a PNG, JPG, or WEBP image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPending(result);
    };
    reader.onerror = () => setError('Could not read the file.');
    reader.readAsDataURL(f);
  }

  async function save() {
    if (!pending) return;
    setSaving(true);
    setError(null);
    try {
      await api.put('/api/tenant/letterhead', { letterhead: pending });
      setCurrent(pending);
      setPending(null);
      setLetterhead(pending);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    if (!confirm('Remove the uploaded letterhead? Future PDFs will fall back to the plain text header.')) return;
    setSaving(true);
    setError(null);
    try {
      await api.put('/api/tenant/letterhead', { letterhead: null });
      setCurrent(null);
      setPending(null);
      setLetterhead(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Clear failed');
    } finally {
      setSaving(false);
    }
  }

  const preview = pending || current;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileImage className="w-4 h-4 text-blue-600" /> Letterhead
        </CardTitle>
        <CardDescription>
          Upload an A4-proportioned image (PNG / JPG / WEBP, max 2.5 MB). It becomes the
          background of every printed report — bills, lab/radiology reports, discharge summaries.
          For best results, leave a 50 mm clear band at the top so the report title doesn't overlap
          your hospital logo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onFile}
              className="hidden"
            />
            <div className="space-y-2">
              <Button onClick={pickFile} variant="outline" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                {current ? 'Replace letterhead' : 'Upload letterhead'}
              </Button>
              {pending && (
                <Button onClick={save} disabled={saving} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              )}
              {current && !pending && (
                <Button onClick={clear} disabled={saving} variant="outline" className="w-full text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove letterhead
                </Button>
              )}
              {error && <p className="text-xs text-red-600">{error}</p>}
              {loading && <p className="text-xs text-slate-500">Loading…</p>}
            </div>
            <ul className="text-xs text-slate-500 mt-4 space-y-1 list-disc pl-4">
              <li>A4 proportions = 210 × 297 mm (~1:1.414).</li>
              <li>300 dpi gives crisp print but inflates file size; 150 dpi is usually enough.</li>
              <li>Keep ~50 mm of clear space at top so report titles don't overlap.</li>
              <li>Set bottom margin if you want signature lines to land below your footer art.</li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">
              {pending ? 'Preview (not saved yet)' : current ? 'Current letterhead' : 'No letterhead set'}
            </div>
            <div
              className="border rounded-md bg-slate-50 flex items-center justify-center"
              style={{ aspectRatio: '210 / 297' }}
            >
              {preview ? (
                <img src={preview} alt="Letterhead preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs text-slate-400 italic">No image</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
