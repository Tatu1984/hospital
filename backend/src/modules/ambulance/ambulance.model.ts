import { z } from 'zod';

// Same trip-type / urgency vocabulary as the staff dispatch console
// (frontend/src/pages/Ambulance.tsx) so trips created from either surface
// land in the same shape.
export const bookTripSchema = z.object({
  pickupLocation: z.string().min(1).max(300),
  dropLocation: z.string().min(1).max(300),
  tripType: z.enum(['EMERGENCY', 'TRANSFER', 'DISCHARGE', 'ROUTINE']).default('EMERGENCY'),
  urgency: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('HIGH'),
  notes: z.string().max(1000).optional().nullable(),
});
export type BookTripInput = z.infer<typeof bookTripSchema>;
