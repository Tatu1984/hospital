import * as repo from './order.repository';
import { OrderListItem, SubmitResultInput } from './order.model';

export class OrderNotFoundError extends Error { constructor() { super('Order not found'); } }
export class CrossTenantError extends Error { constructor() { super('Order belongs to a different tenant'); } }

export async function listForPatient(patientId: string): Promise<OrderListItem[]> {
  const rows = await repo.listForPatient(patientId);
  return rows.map((o: any) => ({
    id: o.id,
    orderType: o.orderType,
    status: o.status,
    priority: o.priority,
    orderedAt: o.orderedAt.toISOString(),
    details: o.details,
    hasResult: (o.results || []).length > 0,
  }));
}

export async function getOne(id: string, tenantId: string) {
  const order = await repo.findById(id);
  if (!order) throw new OrderNotFoundError();
  if ((order as any).patient?.tenantId !== tenantId) throw new CrossTenantError();
  return {
    id: order.id,
    orderType: order.orderType,
    status: order.status,
    priority: order.priority,
    orderedAt: order.orderedAt.toISOString(),
    details: order.details,
    patient: { id: order.patientId, name: (order as any).patient.name, mrn: (order as any).patient.mrn },
  };
}

export async function submitResult(
  orderId: string,
  tenantId: string,
  userId: string,
  input: SubmitResultInput,
) {
  const order = await repo.findById(orderId);
  if (!order) throw new OrderNotFoundError();
  // Cross-tenant guard — Order has no tenantId column itself, so we walk
  // through the patient relation to enforce isolation.
  if (order.patient?.tenantId !== tenantId) throw new CrossTenantError();
  return repo.submitResult(orderId, input.resultData, userId, !!input.isCritical);
}
