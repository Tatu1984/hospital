/**
 * OPD Workflow Routes
 *
 * Handles automatic appointment to encounter linking workflow:
 * - Check-in patients for appointments
 * - Manage OPD queue
 * - Start and complete consultations
 * - Update encounter SOAP notes and vitals
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/db';
import {
  authenticateToken,
  AuthenticatedRequest,
  asyncHandler,
  validateBody,
  requirePermission,
} from '../middleware';
import {
  updateEncounterSchema,
} from '../validators';

const router = Router();

/**
 * POST /api/appointments/:id/check-in
 * Check in patient for appointment
 * - Updates appointment status to 'checked_in'
 * - Automatically creates an Encounter record linked to the appointment
 * - Generates token number for OPD queue
 * - Sets encounter status to 'waiting'
 */
router.post(
  '/appointments/:id/check-in',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    // Get the appointment details
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.status === 'checked_in' || appointment.status === 'completed') {
      return res.status(400).json({ error: 'Appointment already checked in or completed' });
    }

    // Count today's encounters for this doctor to generate token number
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEncountersCount = await prisma.encounter.count({
      where: {
        doctorId: appointment.doctorId,
        visitDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const tokenNumber = `${(appointment.department || 'GEN').slice(0, 3).toUpperCase()}-${String(todayEncountersCount + 1).padStart(3, '0')}`;

    // Create encounter and update appointment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create encounter
      const encounter = await tx.encounter.create({
        data: {
          patientId: appointment.patientId,
          branchId: req.user?.branchId || '',
          doctorId: appointment.doctorId,
          appointmentId: appointment.id,
          type: 'OP',
          status: 'waiting',
          tokenNumber,
          chiefComplaint: appointment.reason,
          visitDate: new Date(),
        },
        include: {
          patient: {
            select: {
              id: true,
              mrn: true,
              name: true,
              dob: true,
              gender: true,
              contact: true,
              email: true,
              bloodGroup: true,
              allergies: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update appointment status
      const updatedAppointment = await tx.appointment.update({
        where: { id },
        data: { status: 'checked_in' },
      });

      return { encounter, appointment: updatedAppointment };
    });

    res.json({
      message: 'Patient checked in successfully',
      encounterId: result.encounter.id,
      tokenNumber: result.encounter.tokenNumber,
      encounter: result.encounter,
      appointment: result.appointment,
    });
  })
);

/**
 * GET /api/opd/queue
 * Get OPD queue (patients checked in, waiting)
 * - Returns encounters with status 'waiting' or 'in_progress'
 * - Includes patient info, doctor info, appointment time, token number
 * - Orders by check-in time or token number
 */
router.get(
  '/opd/queue',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { doctorId, department } = req.query;

    const where: any = {
      branchId: req.user?.branchId || '',
      status: { in: ['waiting', 'in_progress'] },
      type: 'OP',
    };

    if (doctorId) {
      where.doctorId = doctorId as string;
    }

    if (department) {
      where.appointment = {
        department: department as string,
      };
    }

    const encounters = await prisma.encounter.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            name: true,
            dob: true,
            gender: true,
            contact: true,
            bloodGroup: true,
            allergies: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            appointmentTime: true,
            department: true,
            type: true,
          },
        },
      },
      orderBy: [
        { status: 'desc' }, // in_progress first
        { visitDate: 'asc' }, // then by check-in time
      ],
    });

    // Calculate queue position and wait time
    const queue = encounters.map((encounter, index) => {
      const position = encounter.status === 'in_progress' ? 0 : index + 1;
      const estimatedWaitMinutes = encounter.status === 'in_progress' ? 0 : (index + 1) * 15;

      return {
        ...encounter,
        queuePosition: position,
        estimatedWaitMinutes,
      };
    });

    res.json({
      total: queue.length,
      waiting: queue.filter((e) => e.status === 'waiting').length,
      inProgress: queue.filter((e) => e.status === 'in_progress').length,
      queue,
    });
  })
);

/**
 * POST /api/opd/encounters/:id/start
 * Start consultation
 * - Updates encounter status to 'in_progress'
 * - Records start time
 */
router.post(
  '/opd/encounters/:id/start',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const encounter = await prisma.encounter.findUnique({
      where: { id },
    });

    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    if (encounter.status !== 'waiting') {
      return res.status(400).json({ error: 'Encounter is not in waiting status' });
    }

    const updatedEncounter = await prisma.encounter.update({
      where: { id },
      data: {
        status: 'in_progress',
        startTime: new Date(),
      },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            name: true,
            dob: true,
            gender: true,
            contact: true,
            email: true,
            bloodGroup: true,
            allergies: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        appointment: true,
      },
    });

    res.json({
      message: 'Consultation started',
      encounter: updatedEncounter,
    });
  })
);

/**
 * POST /api/opd/encounters/:id/complete
 * Complete encounter
 * - Updates encounter status to 'completed'
 * - Updates linked appointment status to 'completed'
 * - Records end time
 */
router.post(
  '/opd/encounters/:id/complete',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const encounter = await prisma.encounter.findUnique({
      where: { id },
    });

    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    if (encounter.status === 'completed') {
      return res.status(400).json({ error: 'Encounter already completed' });
    }

    // Update encounter and appointment in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedEncounter = await tx.encounter.update({
        where: { id },
        data: {
          status: 'completed',
          endTime: new Date(),
        },
        include: {
          patient: true,
          doctor: true,
          appointment: true,
        },
      });

      // Update linked appointment if exists
      if (updatedEncounter.appointmentId) {
        await tx.appointment.update({
          where: { id: updatedEncounter.appointmentId },
          data: { status: 'completed' },
        });
      }

      return updatedEncounter;
    });

    res.json({
      message: 'Encounter completed successfully',
      encounter: result,
    });
  })
);

/**
 * GET /api/opd/encounters/:id
 * Get encounter details
 * - Includes patient info, vitals, SOAP notes, orders, prescriptions
 */
router.get(
  '/opd/encounters/:id',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const encounter = await prisma.encounter.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            name: true,
            dob: true,
            gender: true,
            contact: true,
            email: true,
            address: true,
            bloodGroup: true,
            allergies: true,
            emergencyContact: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            appointmentTime: true,
            department: true,
            type: true,
            reason: true,
          },
        },
        opdNotes: {
          include: {
            prescriptions: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        orders: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    res.json(encounter);
  })
);

/**
 * PUT /api/opd/encounters/:id
 * Update encounter (save SOAP notes, vitals)
 * - Allows saving subjective, objective, assessment, plan
 * - Saves vitals
 */
router.put(
  '/opd/encounters/:id',
  authenticateToken,
  validateBody(updateEncounterSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { subjective, objective, assessment, plan, vitals } = req.body;

    const encounter = await prisma.encounter.findUnique({
      where: { id },
    });

    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    if (encounter.status === 'completed') {
      return res.status(400).json({ error: 'Cannot update completed encounter' });
    }

    const updatedEncounter = await prisma.encounter.update({
      where: { id },
      data: {
        ...(subjective !== undefined && { subjective }),
        ...(objective !== undefined && { objective }),
        ...(assessment !== undefined && { assessment }),
        ...(plan !== undefined && { plan }),
        ...(vitals !== undefined && { vitals }),
      },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            name: true,
            dob: true,
            gender: true,
            contact: true,
            bloodGroup: true,
            allergies: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
        appointment: true,
      },
    });

    res.json({
      message: 'Encounter updated successfully',
      encounter: updatedEncounter,
    });
  })
);

export default router;
