// Shared math + DB helpers for HR / payroll. Keeps server.ts focused
// on routing while the gnarly date-counting and balance-mutation logic
// lives here, testable in isolation.

import { PrismaClient } from '@prisma/client';

// Calendar days inclusive between two dates, ignoring time-of-day.
export function calendarDaysInclusive(from: Date, to: Date): number {
  const a = new Date(from); a.setHours(0, 0, 0, 0);
  const b = new Date(to);   b.setHours(0, 0, 0, 0);
  return Math.floor((b.getTime() - a.getTime()) / (24 * 3600 * 1000)) + 1;
}

// Working days between two dates (inclusive). Excludes Sundays. Public
// holidays are not subtracted here — they need a holiday calendar table
// which is a future iteration.
export function workingDaysInclusive(from: Date, to: Date): number {
  let count = 0;
  const cursor = new Date(from); cursor.setHours(0, 0, 0, 0);
  const end = new Date(to); end.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    const dow = cursor.getDay();
    if (dow !== 0) count += 1; // Sunday = 0
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

// Calendar days in a (1-indexed) month/year.
export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

// Working days in a month: calendar days minus Sundays. Saturday is a
// working day for healthcare unless the hospital configures otherwise.
export function workingDaysInMonth(month: number, year: number): number {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month - 1, daysInMonth(month, year));
  return workingDaysInclusive(start, end);
}

// Categorize a leave type as paid or LOP. Hospital-typical defaults;
// can be overridden later via tenant config. Half-day attendance is
// also a paid leave (counted as 0.5 day).
const PAID_LEAVE_TYPES = new Set([
  'sick', 'casual', 'earned', 'privilege', 'maternity', 'paternity', 'compoff',
]);
export function isPaidLeaveType(leaveType: string): boolean {
  return PAID_LEAVE_TYPES.has(leaveType.toLowerCase().trim());
}

// Adjusts the matching LeaveBalance row's `used` field by `delta`. If
// no balance row exists for (employee, leaveType, year), one is created
// with entitled=0 — admins can seed it later. Caller is responsible for
// the sign of `delta` (positive on approve, negative on reject/cancel).
export async function adjustLeaveBalance(
  prisma: PrismaClient,
  args: { tenantId: string; employeeId: string; leaveType: string; year: number; delta: number },
): Promise<void> {
  const { tenantId, employeeId, leaveType, year, delta } = args;
  const existing = await prisma.leaveBalance.findUnique({
    where: { employeeId_leaveType_year: { employeeId, leaveType, year } },
  });
  if (!existing) {
    // Bootstrap a row with zero entitlement so the `used` count still
    // shows up. Negative `available` flags admins that the employee
    // overshot their (zero) allotment — they can either grant more
    // entitled days or treat it as LOP.
    await prisma.leaveBalance.create({
      data: { tenantId, employeeId, leaveType, year, entitled: 0, used: delta },
    });
    return;
  }
  await prisma.leaveBalance.update({
    where: { id: existing.id },
    data: { used: { increment: delta } as any },
  });
}

// Rolls every distinct date in [from..to] for an employee into a single
// EmployeeAttendance row with status 'on_leave'. Used by the leave-
// approve handler so payroll later sees these days as paid leave even
// if the employee never punched. If a row already exists for the date
// (e.g. the employee did punch in at half-day) it's updated to merge.
export async function markAttendanceLeave(
  prisma: PrismaClient,
  args: { tenantId: string; employeeId: string; from: Date; to: Date; remarks?: string },
): Promise<number> {
  const { tenantId, employeeId, from, to, remarks } = args;
  const cursor = new Date(from); cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);   end.setHours(0, 0, 0, 0);
  let written = 0;
  while (cursor.getTime() <= end.getTime()) {
    const date = new Date(cursor);
    await prisma.employeeAttendance.upsert({
      where: { employeeId_date: { employeeId, date } },
      create: { tenantId, employeeId, date, status: 'on_leave', remarks: remarks || null },
      update: { status: 'on_leave', remarks: remarks || null },
    });
    written += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return written;
}

// Counts how a month's attendance breaks down for one employee. Single
// pass over the EmployeeAttendance rows. Anything not in the rows is
// treated as absent (LOP) — the punch logic creates a row on every
// punch so a missing row really does mean the employee never showed.
export interface AttendanceBreakdown {
  daysPresent: number;        // status = 'present' (full day)
  daysHalfDay: number;        // status = 'half_day' (counts 0.5)
  daysOnPaidLeave: number;    // status = 'on_leave' AND leave type is paid
  daysOnUnpaidLeave: number;  // status = 'on_leave' AND leave type is unpaid
  daysAbsent: number;         // status = 'absent'
  daysWithNoData: number;     // working days with no row at all (LOP)
}

export async function attendanceBreakdownForMonth(
  prisma: PrismaClient,
  args: { employeeId: string; month: number; year: number },
): Promise<AttendanceBreakdown> {
  const { employeeId, month, year } = args;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month - 1, daysInMonth(month, year));

  const [attendance, leaves] = await Promise.all([
    prisma.employeeAttendance.findMany({
      where: { employeeId, date: { gte: startDate, lte: endDate } },
    }),
    prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: 'approved',
        OR: [
          { fromDate: { lte: endDate }, toDate: { gte: startDate } },
        ],
      },
    }),
  ]);

  // Build a date → leave-type map for quick lookup
  const leaveTypeByDate: Record<string, string> = {};
  for (const lv of leaves) {
    const a = new Date(Math.max(lv.fromDate.getTime(), startDate.getTime()));
    const b = new Date(Math.min(lv.toDate.getTime(), endDate.getTime()));
    const cur = new Date(a); cur.setHours(0, 0, 0, 0);
    const stop = new Date(b); stop.setHours(0, 0, 0, 0);
    while (cur.getTime() <= stop.getTime()) {
      leaveTypeByDate[cur.toISOString().slice(0, 10)] = lv.leaveType;
      cur.setDate(cur.getDate() + 1);
    }
  }

  let present = 0, half = 0, paidLv = 0, unpaidLv = 0, absent = 0;
  const seen = new Set<string>();

  for (const row of attendance) {
    const dayKey = new Date(row.date).toISOString().slice(0, 10);
    seen.add(dayKey);
    switch (row.status) {
      case 'present':   present += 1; break;
      case 'half_day':  half += 1; break;
      case 'on_leave': {
        const lt = leaveTypeByDate[dayKey];
        if (lt && isPaidLeaveType(lt)) paidLv += 1;
        else unpaidLv += 1;
        break;
      }
      case 'absent': absent += 1; break;
      default: present += 1; break; // unknown statuses count as present
    }
  }

  // Working days in the month with no attendance row at all → LOP.
  let noData = 0;
  const cursor = new Date(startDate);
  while (cursor.getTime() <= endDate.getTime()) {
    const k = cursor.toISOString().slice(0, 10);
    if (cursor.getDay() !== 0 && !seen.has(k)) noData += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    daysPresent: present,
    daysHalfDay: half,
    daysOnPaidLeave: paidLv,
    daysOnUnpaidLeave: unpaidLv,
    daysAbsent: absent,
    daysWithNoData: noData,
  };
}

// Generates the next sequential payslip number for a tenant in the
// canonical PSYYYYMM###### format. Cheap counter via a $queryRaw on
// payslips.payslipNumber — no separate sequence table needed.
export async function nextPayslipNumber(
  prisma: PrismaClient,
  args: { month: number; year: number },
): Promise<string> {
  const { month, year } = args;
  const prefix = `PS${year}${String(month).padStart(2, '0')}`;
  const last = await prisma.payslip.findFirst({
    where: { payslipNumber: { startsWith: prefix } },
    orderBy: { payslipNumber: 'desc' },
    select: { payslipNumber: true },
  });
  const n = last ? parseInt(last.payslipNumber.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(n).padStart(6, '0')}`;
}
