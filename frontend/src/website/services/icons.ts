import {
  HeartPulse, Brain, Baby, Bone, Eye, Activity, Microscope, Pill,
  Stethoscope, Scissors, Droplet, Bed, Ambulance, Syringe, type LucideIcon,
} from 'lucide-react';

/**
 * Lookup map so service data can stay JSON-friendly (string key → component).
 * Keys must match the `iconKey` field in services/data.ts.
 */
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  HeartPulse, Brain, Baby, Bone, Eye, Activity, Microscope, Pill,
  Stethoscope, Scissors, Droplet, Bed, Ambulance, Syringe,
};
