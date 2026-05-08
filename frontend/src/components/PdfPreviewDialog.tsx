// PdfPreviewDialog — in-app PDF viewer with explicit Print + Download
// buttons. Used everywhere a "View Report" or "View Bill" button used
// to call doc.save(...) directly (which auto-downloaded the file).
//
// Implementation:
//   • jsPDF.output('bloburl') gives us a blob URL pointing at an
//     in-memory PDF
//   • Browser's native PDF viewer renders it inside an <iframe>; the
//     viewer has its own Save / Print toolbar but we expose explicit
//     buttons in the dialog header for users who don't notice it
//   • We revoke the blob URL on close so the memory doesn't leak

import { useEffect, useState } from 'react';
import type jsPDF from 'jspdf';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, X } from 'lucide-react';

export interface PdfDoc {
  doc: jsPDF;
  filename: string;
}

interface Props {
  /** The doc + filename returned by a generateXxxPDF() call. Pass null to close. */
  pdf: PdfDoc | null;
  onClose: () => void;
  /** Optional title shown in the dialog header (defaults to filename without .pdf) */
  title?: string;
}

export default function PdfPreviewDialog({ pdf, onClose, title }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Whenever the pdf prop changes, rebuild the blob URL. Revoke the
  // previous one so we don't leak. The generated jsPDF stays in memory
  // until the parent drops the reference.
  useEffect(() => {
    if (!pdf) {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      return;
    }
    const url = pdf.doc.output('bloburl') as unknown as string;
    setBlobUrl(url);
    return () => {
      try { URL.revokeObjectURL(url); } catch { /* best effort */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf]);

  function download() {
    if (!pdf) return;
    pdf.doc.save(pdf.filename);
  }

  function print() {
    if (!blobUrl) return;
    // Open the blob in a hidden iframe and trigger print on its
    // contentWindow. This avoids changing the parent page's location
    // and respects the user's printer dialog. If popup blocker swallows
    // it, fall back to opening the blob in a new tab.
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.open(blobUrl, '_blank');
      }
      // Don't immediately remove the iframe — Chrome cancels the print
      // job if the iframe disappears mid-spool. Clean up after 60 s.
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch { /* gone */ }
      }, 60_000);
    };
  }

  const headerTitle = title || pdf?.filename.replace(/\.pdf$/i, '') || 'Preview';

  return (
    <Dialog open={!!pdf} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex flex-row items-center justify-between">
          <DialogTitle className="truncate">{headerTitle}</DialogTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={print} disabled={!blobUrl}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={download} disabled={!pdf}>
              <Download className="w-4 h-4 mr-1" /> Download
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 px-6 pb-2 overflow-hidden">
          {blobUrl ? (
            <iframe
              src={blobUrl}
              title={headerTitle}
              className="w-full h-full border rounded-md"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-slate-500">
              Rendering preview…
            </div>
          )}
        </div>
        <DialogFooter className="px-6 pb-6 pt-2 text-xs text-slate-500 italic">
          The browser's PDF viewer above also has its own Print and Save toolbar.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
