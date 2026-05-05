import * as repo from './report.repository';
import {
  ReportListItem,
  LabReportDetail,
  RadiologyReportDetail,
  PrescriptionDetail,
  InvoiceDetail,
  ReportDetail,
} from './report.model';

export class ReportNotFoundError extends Error {
  constructor() { super('Report not found'); }
}

// Aggregates all four record types into one reverse-chrono timeline. Each
// category contributes its own headline + summary so the mobile list can
// render rich cards without doing per-row follow-up fetches.
export async function listMine(patientId: string): Promise<ReportListItem[]> {
  const [orders, prescriptions, invoices] = await Promise.all([
    repo.listLabAndRadiologyOrders(patientId),
    repo.listPrescriptions(patientId),
    repo.listInvoices(patientId),
  ]);

  const items: ReportListItem[] = [];

  for (const o of orders) {
    const isLab = o.orderType === 'lab';
    const details = (o.details as any) || {};
    // Best-effort title from the structured details JSON. Most lab orders
    // store { tests: [{ name, ... }] }; radiology stores { modality,
    // bodyPart }. Fall back to the orderType label.
    const title =
      (details.tests?.[0]?.name && details.tests.length > 1)
        ? `${details.tests[0].name} +${details.tests.length - 1} more`
        : details.tests?.[0]?.name
        || (details.modality ? `${details.modality} ${details.bodyPart || ''}`.trim() : null)
        || details.testName
        || (isLab ? 'Lab order' : 'Radiology order');
    const summary = o.results.length
      ? `${o.results.length} result${o.results.length === 1 ? '' : 's'} available`
      : `Status: ${o.status}`;
    items.push({
      id: o.id,
      category: isLab ? 'lab' : 'radiology',
      title,
      date: o.orderedAt.toISOString(),
      status: o.status,
      summary,
    });
  }

  for (const rx of prescriptions) {
    // drugs is Json — Prisma's narrow type doesn't know its shape. We
    // expect [{ name, dose, ... }] in the existing seed/usage; cast
    // through any to read the headline.
    const drugs = (Array.isArray(rx.drugs) ? rx.drugs : []) as any[];
    const firstName = drugs[0]?.name;
    items.push({
      id: rx.id,
      category: 'prescription',
      title: firstName
        ? (drugs.length > 1 ? `${firstName} +${drugs.length - 1} more` : firstName)
        : 'Prescription',
      date: rx.createdAt.toISOString(),
      status: 'issued',
      summary: rx.doctor?.name ? `Issued by ${rx.doctor.name}` : 'Prescription',
    });
  }

  for (const inv of invoices) {
    const total = Number(inv.total);
    const balance = Number(inv.balance);
    const summary = balance > 0
      ? `₹${balance.toFixed(2)} outstanding`
      : `₹${total.toFixed(2)} paid`;
    items.push({
      id: inv.id,
      category: 'invoice',
      title: inv.type ? `${inv.type} bill` : 'Invoice',
      date: inv.createdAt.toISOString(),
      status: inv.status,
      summary,
    });
  }

  return items.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getDetail(
  patientId: string,
  category: string,
  id: string,
): Promise<ReportDetail> {
  if (category === 'lab' || category === 'radiology') {
    const o = await repo.findOrder(patientId, id);
    if (!o || (category === 'lab' && o.orderType !== 'lab') || (category === 'radiology' && o.orderType !== 'radiology')) {
      throw new ReportNotFoundError();
    }
    const base = {
      id: o.id,
      orderedAt: o.orderedAt.toISOString(),
      status: o.status,
      details: o.details,
      doctorName: (o as any).encounter?.doctor?.name || null,
      results: o.results.map((r) => ({
        id: r.id,
        resultedAt: r.resultedAt.toISOString(),
        resultData: r.resultData,
        verifiedBy: r.verifiedBy,
      })),
    };
    return category === 'lab'
      ? { category: 'lab', ...base } as LabReportDetail
      : { category: 'radiology', ...base } as RadiologyReportDetail;
  }
  if (category === 'prescription') {
    const rx = await repo.findPrescription(patientId, id);
    if (!rx) throw new ReportNotFoundError();
    return {
      id: rx.id,
      category: 'prescription',
      issuedAt: rx.createdAt.toISOString(),
      doctorName: rx.doctor?.name || null,
      drugs: rx.drugs,
    } as PrescriptionDetail;
  }
  if (category === 'invoice') {
    const inv = await repo.findInvoice(patientId, id);
    if (!inv) throw new ReportNotFoundError();
    return {
      id: inv.id,
      category: 'invoice',
      type: inv.type,
      createdAt: inv.createdAt.toISOString(),
      status: inv.status,
      subtotal: Number(inv.subtotal),
      discount: Number(inv.discount),
      tax: Number(inv.tax),
      total: Number(inv.total),
      paid: Number(inv.paid),
      balance: Number(inv.balance),
      items: inv.items,
    } as InvoiceDetail;
  }
  throw new ReportNotFoundError();
}
