import { z } from 'zod';

// Permissive result-entry shape used by the doctor app. Unlike the desktop
// /api/lab-results endpoint (which requires a registered testId from the
// master data table), this accepts the raw resultData JSON the mobile UI
// builds — values[] for lab orders, { findings, impression } for
// radiology, free text for everything else.
export const submitResultSchema = z.object({
  resultData: z.any(), // category-shaped on the client; persisted as JSON
  isCritical: z.boolean().default(false),
});
export type SubmitResultInput = z.infer<typeof submitResultSchema>;

export interface OrderListItem {
  id: string;
  orderType: string;
  status: string;
  priority: string;
  orderedAt: string;
  details: any;
  hasResult: boolean;
}
