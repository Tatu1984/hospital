/**
 * Bed Management Service
 *
 * Handles bed availability checking, conflict detection, and bed reservation
 * for the Hospital ERP system.
 */

import { prisma } from '../lib/db';
import { Prisma } from '@prisma/client';

export type BedStatus = 'vacant' | 'occupied' | 'reserved' | 'maintenance' | 'dirty';

export interface BedConflict {
  hasConflict: boolean;
  conflictType?: 'occupied' | 'reserved' | 'maintenance';
  currentAdmission?: {
    id: string;
    patientId: string;
    patientName: string;
    admissionDate: Date;
    status: string;
  };
  currentReservation?: {
    id: string;
    patientId: string;
    patientName: string;
    reservedFrom: Date;
    reservedUntil: Date;
    status: string;
  };
  message?: string;
}

export interface BedAvailabilityCheck {
  isAvailable: boolean;
  bedId: string;
  bedNumber: string;
  currentStatus: string;
  reason?: string;
  conflict?: BedConflict;
}

export interface AvailableBed {
  id: string;
  bedNumber: string;
  category: string;
  floor?: string;
  wardId?: string;
  status: string;
}

/**
 * Check if a bed is available for a specific date range
 * @param bedId - The bed ID to check
 * @param fromDate - Start date of the proposed admission/reservation
 * @param toDate - End date (optional, for reservations)
 * @returns BedAvailabilityCheck object with availability status and details
 */
export async function checkBedAvailability(
  bedId: string,
  fromDate: Date,
  toDate?: Date
): Promise<BedAvailabilityCheck> {
  try {
    // Get bed details
    const bed = await prisma.bed.findUnique({
      where: { id: bedId },
      include: {
        admissions: {
          where: {
            status: {
              in: ['active', 'admitted']
            },
            dischargeDate: null
          },
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                mrn: true
              }
            }
          },
          orderBy: {
            admissionDate: 'desc'
          },
          take: 1
        }
      }
    });

    if (!bed) {
      return {
        isAvailable: false,
        bedId,
        bedNumber: 'Unknown',
        currentStatus: 'not_found',
        reason: 'Bed not found'
      };
    }

    // Check if bed is in maintenance or dirty status
    if (bed.status === 'maintenance') {
      return {
        isAvailable: false,
        bedId: bed.id,
        bedNumber: bed.bedNumber,
        currentStatus: bed.status,
        reason: 'Bed is under maintenance',
        conflict: {
          hasConflict: true,
          conflictType: 'maintenance',
          message: 'Bed is currently under maintenance'
        }
      };
    }

    if (bed.status === 'dirty') {
      return {
        isAvailable: false,
        bedId: bed.id,
        bedNumber: bed.bedNumber,
        currentStatus: bed.status,
        reason: 'Bed requires cleaning'
      };
    }

    // Check for active admission
    if (bed.admissions && bed.admissions.length > 0) {
      const activeAdmission = bed.admissions[0];
      return {
        isAvailable: false,
        bedId: bed.id,
        bedNumber: bed.bedNumber,
        currentStatus: 'occupied',
        reason: `Bed is currently occupied by patient ${activeAdmission.patient.name} (MRN: ${activeAdmission.patient.mrn})`,
        conflict: {
          hasConflict: true,
          conflictType: 'occupied',
          currentAdmission: {
            id: activeAdmission.id,
            patientId: activeAdmission.patientId,
            patientName: activeAdmission.patient.name,
            admissionDate: activeAdmission.admissionDate,
            status: activeAdmission.status
          },
          message: `Bed occupied since ${activeAdmission.admissionDate.toISOString()}`
        }
      };
    }

    // Check for overlapping reservations if toDate is provided
    if (toDate) {
      const overlappingReservations = await prisma.bedReservation.findMany({
        where: {
          bedId: bed.id,
          status: 'active',
          OR: [
            {
              // Reservation starts during our period
              AND: [
                { reservedFrom: { lte: toDate } },
                { reservedUntil: { gte: fromDate } }
              ]
            }
          ]
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              mrn: true
            }
          }
        },
        orderBy: {
          reservedFrom: 'asc'
        },
        take: 1
      });

      if (overlappingReservations.length > 0) {
        const reservation = overlappingReservations[0];
        return {
          isAvailable: false,
          bedId: bed.id,
          bedNumber: bed.bedNumber,
          currentStatus: 'reserved',
          reason: `Bed is reserved for patient ${reservation.patient.name} from ${reservation.reservedFrom.toISOString()} to ${reservation.reservedUntil.toISOString()}`,
          conflict: {
            hasConflict: true,
            conflictType: 'reserved',
            currentReservation: {
              id: reservation.id,
              patientId: reservation.patientId,
              patientName: reservation.patient.name,
              reservedFrom: reservation.reservedFrom,
              reservedUntil: reservation.reservedUntil,
              status: reservation.status
            },
            message: `Bed reserved from ${reservation.reservedFrom.toISOString()} to ${reservation.reservedUntil.toISOString()}`
          }
        };
      }
    }

    // Bed is available
    return {
      isAvailable: true,
      bedId: bed.id,
      bedNumber: bed.bedNumber,
      currentStatus: bed.status
    };

  } catch (error) {
    console.error('Error checking bed availability:', error);
    throw error;
  }
}

/**
 * Find all available beds matching the criteria
 * @param wardId - Ward ID to search in
 * @param category - Bed category (general, private, icu, etc.)
 * @param fromDate - Start date for availability check
 * @param toDate - Optional end date for reservation
 * @returns Array of available beds
 */
export async function findAvailableBeds(
  wardId: string,
  category: string,
  fromDate: Date,
  toDate?: Date
): Promise<AvailableBed[]> {
  try {
    // Get all beds matching criteria
    const beds = await prisma.bed.findMany({
      where: {
        wardId,
        category,
        status: {
          in: ['vacant', 'reserved'] // Include reserved beds to check their availability
        }
      },
      orderBy: {
        bedNumber: 'asc'
      }
    });

    // Check each bed's availability
    const availableBedsPromises = beds.map(async (bed) => {
      const availability = await checkBedAvailability(bed.id, fromDate, toDate);
      if (availability.isAvailable) {
        return {
          id: bed.id,
          bedNumber: bed.bedNumber,
          category: bed.category,
          floor: bed.floor || undefined,
          wardId: bed.wardId || undefined,
          status: bed.status
        };
      }
      return null;
    });

    const results = await Promise.all(availableBedsPromises);
    return results.filter((bed): bed is NonNullable<typeof bed> => bed !== null) as AvailableBed[];

  } catch (error) {
    console.error('Error finding available beds:', error);
    throw error;
  }
}

/**
 * Detect conflicts for a specific bed and admission
 * @param bedId - Bed ID to check
 * @param admissionId - Current admission ID (to exclude from conflict check)
 * @returns BedConflict object
 */
export async function detectConflicts(
  bedId: string,
  admissionId: string
): Promise<BedConflict> {
  try {
    // Check for other active admissions on this bed
    const conflictingAdmissions = await prisma.admission.findMany({
      where: {
        bedId,
        id: { not: admissionId },
        status: {
          in: ['active', 'admitted']
        },
        dischargeDate: null
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            mrn: true
          }
        }
      },
      orderBy: {
        admissionDate: 'desc'
      },
      take: 1
    });

    if (conflictingAdmissions.length > 0) {
      const admission = conflictingAdmissions[0];
      return {
        hasConflict: true,
        conflictType: 'occupied',
        currentAdmission: {
          id: admission.id,
          patientId: admission.patientId,
          patientName: admission.patient.name,
          admissionDate: admission.admissionDate,
          status: admission.status
        },
        message: `Bed is occupied by another patient: ${admission.patient.name} (MRN: ${admission.patient.mrn})`
      };
    }

    // Check bed status
    const bed = await prisma.bed.findUnique({
      where: { id: bedId }
    });

    if (!bed) {
      return {
        hasConflict: true,
        message: 'Bed not found'
      };
    }

    if (bed.status === 'maintenance') {
      return {
        hasConflict: true,
        conflictType: 'maintenance',
        message: 'Bed is under maintenance'
      };
    }

    // No conflicts
    return {
      hasConflict: false
    };

  } catch (error) {
    console.error('Error detecting bed conflicts:', error);
    throw error;
  }
}

/**
 * Get bed assignment history
 * @param bedId - Bed ID
 * @param limit - Number of records to retrieve (default: 50)
 * @returns Array of historical admissions for the bed
 */
export async function getBedHistory(bedId: string, limit: number = 50) {
  try {
    const history = await prisma.admission.findMany({
      where: { bedId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            mrn: true,
            contact: true
          }
        },
        admittingDoctor: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        admissionDate: 'desc'
      },
      take: limit
    });

    return history.map(admission => ({
      admissionId: admission.id,
      patientId: admission.patientId,
      patientName: admission.patient.name,
      patientMRN: admission.patient.mrn,
      admissionDate: admission.admissionDate,
      dischargeDate: admission.dischargeDate,
      status: admission.status,
      diagnosis: admission.diagnosis,
      admittingDoctor: admission.admittingDoctor ? {
        id: admission.admittingDoctor.id,
        name: admission.admittingDoctor.name
      } : null,
      durationDays: admission.dischargeDate
        ? Math.ceil((admission.dischargeDate.getTime() - admission.admissionDate.getTime()) / (1000 * 60 * 60 * 24))
        : null
    }));

  } catch (error) {
    console.error('Error fetching bed history:', error);
    throw error;
  }
}

/**
 * Reserve a bed for future admission
 * @param bedId - Bed ID to reserve
 * @param patientId - Patient ID
 * @param reservedFrom - Start date of reservation
 * @param reservedUntil - End date of reservation
 * @param admissionId - Optional admission ID if reservation is linked to scheduled admission
 * @returns Created reservation
 */
export async function reserveBed(
  bedId: string,
  patientId: string,
  reservedFrom: Date,
  reservedUntil: Date,
  admissionId?: string
) {
  try {
    // Check if bed is available for the requested period
    const availability = await checkBedAvailability(bedId, reservedFrom, reservedUntil);

    if (!availability.isAvailable) {
      throw new Error(`Bed ${availability.bedNumber} is not available: ${availability.reason}`);
    }

    // Create reservation
    const reservation = await prisma.bedReservation.create({
      data: {
        bedId,
        patientId,
        reservedFrom,
        reservedUntil,
        status: 'active',
        admissionId
      },
      include: {
        bed: {
          select: {
            bedNumber: true,
            category: true,
            floor: true
          }
        },
        patient: {
          select: {
            name: true,
            mrn: true,
            contact: true
          }
        }
      }
    });

    // Update bed status to reserved
    await prisma.bed.update({
      where: { id: bedId },
      data: { status: 'reserved' }
    });

    return reservation;

  } catch (error) {
    console.error('Error reserving bed:', error);
    throw error;
  }
}

/**
 * Cancel a bed reservation
 * @param reservationId - Reservation ID to cancel
 * @returns Updated reservation
 */
export async function cancelReservation(reservationId: string) {
  try {
    const reservation = await prisma.bedReservation.update({
      where: { id: reservationId },
      data: { status: 'cancelled' }
    });

    // Check if there are any other active reservations for this bed
    const activeReservations = await prisma.bedReservation.count({
      where: {
        bedId: reservation.bedId,
        status: 'active'
      }
    });

    // If no active reservations and no current admission, mark bed as vacant
    if (activeReservations === 0) {
      const activeAdmission = await prisma.admission.count({
        where: {
          bedId: reservation.bedId,
          status: { in: ['active', 'admitted'] },
          dischargeDate: null
        }
      });

      if (activeAdmission === 0) {
        await prisma.bed.update({
          where: { id: reservation.bedId },
          data: { status: 'vacant' }
        });
      }
    }

    return reservation;

  } catch (error) {
    console.error('Error cancelling reservation:', error);
    throw error;
  }
}

/**
 * Update bed status
 * @param bedId - Bed ID
 * @param status - New bed status
 * @returns Updated bed
 */
export async function updateBedStatus(bedId: string, status: BedStatus) {
  try {
    // Validate status transition
    if (status === 'occupied') {
      // Only allow setting to occupied through admission process
      throw new Error('Bed status cannot be set to occupied directly. Use admission process.');
    }

    const bed = await prisma.bed.update({
      where: { id: bedId },
      data: { status }
    });

    return bed;

  } catch (error) {
    console.error('Error updating bed status:', error);
    throw error;
  }
}

/**
 * Transfer patient to a new bed
 * @param admissionId - Admission ID
 * @param newBedId - New bed ID
 * @param oldBedId - Current bed ID
 * @param reason - Reason for transfer
 * @returns Updated admission
 */
export async function transferBed(
  admissionId: string,
  newBedId: string,
  oldBedId: string | null,
  reason?: string
) {
  try {
    // Check if new bed is available
    const availability = await checkBedAvailability(newBedId, new Date());

    if (!availability.isAvailable) {
      throw new Error(`Cannot transfer: ${availability.reason}`);
    }

    // Update admission with new bed
    const admission = await prisma.admission.update({
      where: { id: admissionId },
      data: { bedId: newBedId }
    });

    // Update new bed status to occupied
    await prisma.bed.update({
      where: { id: newBedId },
      data: { status: 'occupied' }
    });

    // Update old bed status to dirty (requires cleaning)
    if (oldBedId) {
      await prisma.bed.update({
        where: { id: oldBedId },
        data: { status: 'dirty' }
      });
    }

    return admission;

  } catch (error) {
    console.error('Error transferring bed:', error);
    throw error;
  }
}

export const bedManagementService = {
  checkBedAvailability,
  findAvailableBeds,
  detectConflicts,
  getBedHistory,
  reserveBed,
  cancelReservation,
  updateBedStatus,
  transferBed
};
