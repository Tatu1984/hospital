/**
 * Shift Management Service
 *
 * This module provides comprehensive shift management functionality including:
 * - Shift template management
 * - Shift assignment and scheduling
 * - Conflict detection
 * - Overtime calculation
 * - Staffing level monitoring
 * - Weekly roster generation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Parse time string (HH:MM) to minutes from midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes to hours (decimal)
 */
function minutesToHours(minutes: number): number {
  return minutes / 60;
}

/**
 * Calculate shift duration in minutes
 */
function calculateShiftDuration(
  startTime: string,
  endTime: string,
  isOvernight: boolean,
  breakMinutes: number
): number {
  let startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);

  if (isOvernight && endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours
  }

  const totalMinutes = endMinutes - startMinutes;
  return totalMinutes - breakMinutes;
}

/**
 * Check for shift conflicts for an employee on a given date
 */
export async function checkShiftConflicts(
  employeeId: string,
  date: Date,
  shiftTemplateId: string,
  excludeShiftId?: string
): Promise<{
  hasConflict: boolean;
  conflicts: Array<{ shiftId: string; shiftName: string; date: Date }>;
}> {
  // Check if employee already has a shift on this date
  const existingShift = await prisma.shift.findFirst({
    where: {
      employeeId,
      date: new Date(date),
      id: excludeShiftId ? { not: excludeShiftId } : undefined,
      status: { not: 'absent' }
    },
    include: {
      template: true
    }
  });

  if (existingShift) {
    return {
      hasConflict: true,
      conflicts: [{
        shiftId: existingShift.id,
        shiftName: existingShift.template.name,
        date: existingShift.date
      }]
    };
  }

  // Check if employee is on leave
  const leaveRequest = await prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      status: 'approved',
      fromDate: { lte: new Date(date) },
      toDate: { gte: new Date(date) }
    }
  });

  if (leaveRequest) {
    return {
      hasConflict: true,
      conflicts: [{
        shiftId: '',
        shiftName: 'On Leave',
        date: new Date(date)
      }]
    };
  }

  return {
    hasConflict: false,
    conflicts: []
  };
}

/**
 * Calculate overtime hours for an employee for a given month
 */
export async function calculateOvertimeHours(
  employeeId: string,
  month: number,
  year: number
): Promise<{
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  shiftsWorked: number;
}> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const shifts = await prisma.shift.findMany({
    where: {
      employeeId,
      date: {
        gte: startDate,
        lte: endDate
      },
      status: 'completed'
    },
    include: {
      template: true
    }
  });

  let totalMinutes = 0;

  for (const shift of shifts) {
    if (shift.actualStartTime && shift.actualEndTime) {
      // Use actual work time if available
      const startTime = new Date(shift.actualStartTime).getTime();
      const endTime = new Date(shift.actualEndTime).getTime();
      const workedMinutes = (endTime - startTime) / (1000 * 60);
      totalMinutes += workedMinutes - shift.template.breakMinutes;
    } else {
      // Use template duration
      const duration = calculateShiftDuration(
        shift.template.startTime,
        shift.template.endTime,
        shift.template.isOvernight,
        shift.template.breakMinutes
      );
      totalMinutes += duration;
    }
  }

  const totalHours = minutesToHours(totalMinutes);

  // Standard work hours: 8 hours/day * number of working days (approx 22 days/month)
  const standardMonthlyHours = 8 * 22;
  const overtimeHours = Math.max(0, totalHours - standardMonthlyHours);
  const regularHours = Math.min(totalHours, standardMonthlyHours);

  return {
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    totalHours: Math.round(totalHours * 100) / 100,
    shiftsWorked: shifts.length
  };
}

/**
 * Get staffing levels for a department/ward on a specific date
 */
export async function getStaffingLevels(
  departmentId: string | null,
  wardId: string | null,
  date: Date
): Promise<{
  scheduled: number;
  present: number;
  absent: number;
  onLeave: number;
  adequatelyStaffed: boolean;
  employees: Array<{
    employeeId: string;
    name: string;
    designation: string;
    shiftName: string;
    status: string;
  }>;
}> {
  // Build where clause for employees
  const employeeFilter: any = {
    status: 'active'
  };

  if (departmentId) {
    employeeFilter.department = departmentId;
  }

  // Get all active employees in the department/ward
  const employees = await prisma.employee.findMany({
    where: employeeFilter,
    include: {
      shifts: {
        where: {
          date: new Date(date)
        },
        include: {
          template: true
        }
      },
      leaves: {
        where: {
          status: 'approved',
          fromDate: { lte: new Date(date) },
          toDate: { gte: new Date(date) }
        }
      }
    }
  });

  let scheduled = 0;
  let present = 0;
  let absent = 0;
  let onLeave = 0;

  const employeeDetails = employees.map(emp => {
    const shift = emp.shifts[0];
    const leave = emp.leaves[0];

    let status = 'not_scheduled';
    let shiftName = '-';

    if (leave) {
      onLeave++;
      status = 'on_leave';
      shiftName = 'On Leave';
    } else if (shift) {
      scheduled++;
      shiftName = shift.template.name;
      status = shift.status;

      if (shift.status === 'completed' || shift.status === 'started') {
        present++;
      } else if (shift.status === 'absent') {
        absent++;
      }
    }

    return {
      employeeId: emp.employeeId,
      name: emp.name,
      designation: emp.designation || '',
      shiftName,
      status
    };
  });

  // Determine if adequately staffed (at least 60% of active employees scheduled)
  const activeCount = employees.length;
  const requiredStaffing = Math.ceil(activeCount * 0.6);
  const adequatelyStaffed = scheduled >= requiredStaffing;

  return {
    scheduled,
    present,
    absent,
    onLeave,
    adequatelyStaffed,
    employees: employeeDetails
  };
}

/**
 * Generate weekly roster for a department
 */
export async function generateWeeklyRoster(
  departmentId: string | null,
  weekStartDate: Date,
  publishedBy?: string
): Promise<{
  rosterId: string;
  shiftsCreated: number;
  weekStartDate: Date;
  weekEndDate: Date;
}> {
  const weekStart = new Date(weekStartDate);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Get active shift templates
  const shiftTemplates = await prisma.shiftTemplate.findMany({
    where: { isActive: true },
    orderBy: { startTime: 'asc' }
  });

  if (shiftTemplates.length === 0) {
    throw new Error('No active shift templates found. Please create shift templates first.');
  }

  // Get active employees in the department
  const employeeFilter: any = { status: 'active' };
  if (departmentId) {
    employeeFilter.department = departmentId;
  }

  const employees = await prisma.employee.findMany({
    where: employeeFilter
  });

  if (employees.length === 0) {
    throw new Error('No active employees found in the department.');
  }

  // Create roster record
  const roster = await prisma.shiftRoster.create({
    data: {
      departmentId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      status: 'draft',
      publishedBy,
      publishedAt: publishedBy ? new Date() : null
    }
  });

  // Generate shifts for each day of the week
  const shifts: Array<{
    templateId: string;
    employeeId: string;
    date: Date;
    status: string;
  }> = [];

  // Simple round-robin assignment
  // In a real system, this would be more sophisticated with preferences, availability, etc.
  let employeeIndex = 0;
  let templateIndex = 0;

  for (let day = 0; day < 7; day++) {
    const shiftDate = new Date(weekStart);
    shiftDate.setDate(shiftDate.getDate() + day);

    // Assign shifts to employees (each employee gets one shift per day)
    for (let i = 0; i < employees.length; i++) {
      const employee = employees[employeeIndex % employees.length];
      const template = shiftTemplates[templateIndex % shiftTemplates.length];

      // Check for conflicts
      const conflict = await checkShiftConflicts(
        employee.id,
        shiftDate,
        template.id
      );

      if (!conflict.hasConflict) {
        shifts.push({
          templateId: template.id,
          employeeId: employee.id,
          date: shiftDate,
          status: 'scheduled'
        });
      }

      employeeIndex++;
      templateIndex++;
    }
  }

  // Bulk create shifts
  await prisma.shift.createMany({
    data: shifts,
    skipDuplicates: true
  });

  return {
    rosterId: roster.id,
    shiftsCreated: shifts.length,
    weekStartDate: weekStart,
    weekEndDate: weekEnd
  };
}

/**
 * Get shift details with employee and template information
 */
export async function getShiftDetails(shiftId: string) {
  return await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      template: true,
      employee: {
        select: {
          id: true,
          employeeId: true,
          name: true,
          email: true,
          phone: true,
          department: true,
          designation: true
        }
      }
    }
  });
}

/**
 * Clock in (start shift)
 */
export async function clockIn(shiftId: string): Promise<any> {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { template: true }
  });

  if (!shift) {
    throw new Error('Shift not found');
  }

  if (shift.status !== 'scheduled') {
    throw new Error(`Cannot clock in. Shift status is: ${shift.status}`);
  }

  return await prisma.shift.update({
    where: { id: shiftId },
    data: {
      status: 'started',
      actualStartTime: new Date()
    },
    include: {
      template: true,
      employee: true
    }
  });
}

/**
 * Clock out (end shift)
 */
export async function clockOut(shiftId: string): Promise<any> {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId }
  });

  if (!shift) {
    throw new Error('Shift not found');
  }

  if (shift.status !== 'started') {
    throw new Error(`Cannot clock out. Shift status is: ${shift.status}`);
  }

  return await prisma.shift.update({
    where: { id: shiftId },
    data: {
      status: 'completed',
      actualEndTime: new Date()
    },
    include: {
      template: true,
      employee: true
    }
  });
}

/**
 * Request shift swap
 */
export async function requestShiftSwap(
  requesterId: string,
  requestedShiftId: string,
  targetEmployeeId: string | null,
  offeredShiftId: string | null,
  reason: string | null
): Promise<any> {
  // Verify requester owns the requested shift
  const requestedShift = await prisma.shift.findUnique({
    where: { id: requestedShiftId },
    include: { employee: true }
  });

  if (!requestedShift) {
    throw new Error('Requested shift not found');
  }

  if (requestedShift.employeeId !== requesterId) {
    throw new Error('You can only swap your own shifts');
  }

  if (requestedShift.status !== 'scheduled') {
    throw new Error('Can only swap scheduled shifts');
  }

  return await prisma.shiftSwapRequest.create({
    data: {
      requesterId,
      requestedShiftId,
      targetEmployeeId,
      offeredShiftId,
      status: 'pending',
      reason
    }
  });
}

/**
 * Approve shift swap
 */
export async function approveShiftSwap(
  swapRequestId: string,
  approvedBy: string
): Promise<any> {
  const swapRequest = await prisma.shiftSwapRequest.findUnique({
    where: { id: swapRequestId },
    include: {
      requestedShift: {
        include: { employee: true }
      }
    }
  });

  if (!swapRequest) {
    throw new Error('Swap request not found');
  }

  if (swapRequest.status !== 'pending') {
    throw new Error(`Swap request is already ${swapRequest.status}`);
  }

  // Update swap request
  await prisma.shiftSwapRequest.update({
    where: { id: swapRequestId },
    data: {
      status: 'approved',
      approvedBy,
      approvedAt: new Date()
    }
  });

  // Perform the swap
  if (swapRequest.targetEmployeeId && swapRequest.offeredShiftId) {
    // Swap the two shifts
    await prisma.$transaction([
      prisma.shift.update({
        where: { id: swapRequest.requestedShiftId },
        data: { employeeId: swapRequest.targetEmployeeId }
      }),
      prisma.shift.update({
        where: { id: swapRequest.offeredShiftId },
        data: { employeeId: swapRequest.requesterId }
      })
    ]);
  }

  return swapRequest;
}

/**
 * Publish roster
 */
export async function publishRoster(
  rosterId: string,
  publishedBy: string
): Promise<any> {
  return await prisma.shiftRoster.update({
    where: { id: rosterId },
    data: {
      status: 'published',
      publishedBy,
      publishedAt: new Date()
    }
  });
}

/**
 * Get staffing report for a date range
 */
export async function getStaffingReport(
  startDate: Date,
  endDate: Date,
  departmentId?: string
): Promise<Array<{
  date: Date;
  scheduled: number;
  present: number;
  absent: number;
  onLeave: number;
}>> {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const report = [];

  for (const date of dates) {
    const staffing = await getStaffingLevels(departmentId || null, null, date);
    report.push({
      date,
      scheduled: staffing.scheduled,
      present: staffing.present,
      absent: staffing.absent,
      onLeave: staffing.onLeave
    });
  }

  return report;
}
