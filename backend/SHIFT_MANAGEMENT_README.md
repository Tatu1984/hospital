# Shift Management System - Implementation Guide

## Overview

A comprehensive shift management system has been implemented for the Hospital ERP. This system provides complete control over employee shifts, roster management, clock in/out functionality, shift swaps, and staffing reports.

## Features Implemented

### 1. Database Schema (Prisma)

Four new models have been added to `schema.prisma`:

- **ShiftTemplate**: Define reusable shift patterns (Morning, Evening, Night, etc.)
- **Shift**: Individual shift assignments to employees
- **ShiftSwapRequest**: Employee shift swap requests with approval workflow
- **ShiftRoster**: Weekly roster management with draft/published status

### 2. Core Service Functions (`src/services/shiftManagement.ts`)

#### Shift Template Management
- Create and manage shift templates with configurable start/end times
- Support for overnight shifts
- Configurable break minutes

#### Shift Operations
- `checkShiftConflicts()` - Validate no employee double-booking or leave conflicts
- `clockIn()` - Employee clock-in with actual time tracking
- `clockOut()` - Employee clock-out with actual time tracking
- `getShiftDetails()` - Retrieve detailed shift information

#### Roster Management
- `generateWeeklyRoster()` - Auto-generate weekly rosters with round-robin assignment
- `publishRoster()` - Publish draft rosters to make them official

#### Analytics & Reporting
- `calculateOvertimeHours()` - Calculate monthly overtime for employees
- `getStaffingLevels()` - Check if department is adequately staffed
- `getStaffingReport()` - Generate staffing reports for date ranges

#### Shift Swap Workflow
- `requestShiftSwap()` - Employee initiated shift swap requests
- `approveShiftSwap()` - Manager approval/rejection with automatic shift exchange

### 3. API Endpoints (`src/routes/shifts.ts`)

#### Shift Template Endpoints
```
GET    /api/shifts/templates           - List all shift templates
GET    /api/shifts/templates/:id       - Get single template
POST   /api/shifts/templates           - Create new template
PUT    /api/shifts/templates/:id       - Update template
DELETE /api/shifts/templates/:id       - Deactivate template
```

#### Shift Management Endpoints
```
GET    /api/shifts                     - List shifts (with filters)
GET    /api/shifts/:id                 - Get single shift
POST   /api/shifts                     - Assign shift to employee
PUT    /api/shifts/:id                 - Update shift
POST   /api/shifts/:id/start           - Clock in (start shift)
POST   /api/shifts/:id/end             - Clock out (end shift)
```

#### Roster Management Endpoints
```
POST   /api/shifts/roster/generate     - Auto-generate weekly roster
GET    /api/shifts/roster              - List rosters
POST   /api/shifts/roster/publish      - Publish roster
```

#### Shift Swap Endpoints
```
POST   /api/shifts/swap-request              - Request shift swap
GET    /api/shifts/swap-request              - List swap requests
PUT    /api/shifts/swap-request/:id/approve  - Approve/reject swap
```

#### Reporting Endpoints
```
GET    /api/shifts/staffing-report     - Staffing levels over date range
GET    /api/shifts/overtime/:employeeId - Calculate overtime for employee
GET    /api/shifts/staffing/:date       - Get staffing for specific date
```

### 4. Validation Schemas (`src/validators/index.ts`)

Comprehensive Zod validation for:
- Shift template creation/updates
- Shift assignments
- Roster generation
- Swap requests
- Query filters and parameters

### 5. RBAC Permissions

New permissions added to `src/rbac.ts`:
- `shifts:view` - View shifts and rosters
- `shifts:manage` - Create, update, delete shifts and rosters
- `shifts:clock` - Clock in/out functionality
- `shifts:swap` - Request shift swaps

Permissions granted to roles:
- **ADMIN**: All shift permissions
- **HR**: All shift permissions
- **NURSE**: View, clock, and swap permissions
- **DOCTOR**: View permissions

### 6. Route Permissions

All endpoints configured in `src/routes/index.ts` with appropriate permission checks.

## Usage Examples

### 1. Create Shift Templates

```bash
# Create Morning Shift Template
POST /api/shifts/templates
{
  "name": "Morning Shift",
  "code": "MORNING",
  "startTime": "08:00",
  "endTime": "16:00",
  "breakMinutes": 30,
  "isOvernight": false,
  "isActive": true
}

# Create Night Shift Template (Overnight)
POST /api/shifts/templates
{
  "name": "Night Shift",
  "code": "NIGHT",
  "startTime": "22:00",
  "endTime": "06:00",
  "breakMinutes": 30,
  "isOvernight": true,
  "isActive": true
}

# Create Evening Shift Template
POST /api/shifts/templates
{
  "name": "Evening Shift",
  "code": "EVENING",
  "startTime": "16:00",
  "endTime": "00:00",
  "breakMinutes": 30,
  "isOvernight": true,
  "isActive": true
}
```

### 2. Generate Weekly Roster

```bash
POST /api/shifts/roster/generate
{
  "departmentId": "dept-uuid",
  "weekStartDate": "2024-01-01",
  "publishImmediately": false
}

Response:
{
  "success": true,
  "data": {
    "rosterId": "roster-uuid",
    "shiftsCreated": 42,
    "weekStartDate": "2024-01-01T00:00:00.000Z",
    "weekEndDate": "2024-01-07T23:59:59.999Z"
  },
  "message": "Weekly roster generated successfully. 42 shifts created."
}
```

### 3. Assign Individual Shift

```bash
POST /api/shifts
{
  "templateId": "template-uuid",
  "employeeId": "employee-uuid",
  "date": "2024-01-15",
  "status": "scheduled"
}
```

### 4. Clock In/Out

```bash
# Clock In
POST /api/shifts/{shift-id}/start

Response:
{
  "success": true,
  "data": {
    "id": "shift-uuid",
    "status": "started",
    "actualStartTime": "2024-01-15T08:05:23.000Z",
    ...
  },
  "message": "Clocked in successfully"
}

# Clock Out
POST /api/shifts/{shift-id}/end

Response:
{
  "success": true,
  "data": {
    "id": "shift-uuid",
    "status": "completed",
    "actualEndTime": "2024-01-15T16:02:45.000Z",
    ...
  },
  "message": "Clocked out successfully"
}
```

### 5. Request Shift Swap

```bash
POST /api/shifts/swap-request
{
  "requestedShiftId": "shift-to-give-uuid",
  "targetEmployeeId": "target-employee-uuid",
  "offeredShiftId": "shift-to-receive-uuid",
  "reason": "Personal emergency - need to swap shifts"
}
```

### 6. Approve Shift Swap

```bash
PUT /api/shifts/swap-request/{swap-id}/approve
{
  "approved": true
}
```

### 7. Get Shifts with Filters

```bash
# Get all shifts for a specific employee
GET /api/shifts?employeeId={employee-uuid}&page=1&limit=50

# Get shifts for a department on a specific date
GET /api/shifts?department=Cardiology&date=2024-01-15

# Get shifts for a date range
GET /api/shifts?startDate=2024-01-01&endDate=2024-01-31

# Get shifts by status
GET /api/shifts?status=scheduled
```

### 8. Calculate Overtime

```bash
GET /api/shifts/overtime/{employee-uuid}?month=1&year=2024

Response:
{
  "success": true,
  "data": {
    "regularHours": 176.00,
    "overtimeHours": 24.50,
    "totalHours": 200.50,
    "shiftsWorked": 22
  }
}
```

### 9. Get Staffing Report

```bash
GET /api/shifts/staffing-report?startDate=2024-01-01&endDate=2024-01-31&departmentId=dept-uuid

Response:
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01T00:00:00.000Z",
      "scheduled": 15,
      "present": 14,
      "absent": 1,
      "onLeave": 2
    },
    ...
  ]
}
```

### 10. Get Current Staffing Levels

```bash
GET /api/shifts/staffing/2024-01-15?departmentId=dept-uuid

Response:
{
  "success": true,
  "data": {
    "scheduled": 15,
    "present": 12,
    "absent": 2,
    "onLeave": 1,
    "adequatelyStaffed": true,
    "employees": [
      {
        "employeeId": "EMP001",
        "name": "John Doe",
        "designation": "Staff Nurse",
        "shiftName": "Morning Shift",
        "status": "started"
      },
      ...
    ]
  }
}
```

## Database Migration

After implementing these changes, run the following commands:

```bash
# Generate Prisma client
npm run prisma generate

# Create migration
npx prisma migrate dev --name add_shift_management

# Or push to database directly (for development)
npx prisma db push
```

## Key Features

### Conflict Detection
The system automatically prevents:
- Double-booking employees on the same date
- Assigning shifts to employees on approved leave
- Overlapping shift assignments

### Overtime Calculation
- Tracks both scheduled and actual work hours
- Calculates based on standard 8-hour days, 22 days/month
- Considers break time

### Staffing Level Monitoring
- Real-time staffing status
- Adequacy checks (60% threshold)
- Detailed employee-level breakdown

### Roster Auto-Generation
- Round-robin shift assignment
- Automatic conflict avoidance
- Draft/publish workflow

### Shift Swap Workflow
- Employee-initiated requests
- Manager approval required
- Automatic shift exchange on approval
- Support for direct swaps or open requests

## Security & Permissions

All endpoints are protected with:
- JWT authentication (`authenticateToken` middleware)
- Role-based permissions (`requirePermission` middleware)
- Input validation (Zod schemas)
- SQL injection protection (Prisma ORM)

## Best Practices

1. **Create Templates First**: Set up shift templates before generating rosters
2. **Use Draft Rosters**: Generate as draft, review, then publish
3. **Monitor Staffing**: Regularly check staffing levels to ensure adequate coverage
4. **Track Overtime**: Monitor overtime to manage costs and employee welfare
5. **Enable Shift Swaps**: Allow employees flexibility while maintaining control

## Future Enhancements

Potential improvements that could be added:

1. **Shift Preferences**: Allow employees to set preferred shifts
2. **Availability Calendar**: Let employees mark unavailable dates
3. **Skills-Based Assignment**: Match shifts to employee skills/qualifications
4. **Notifications**: Send alerts for shift assignments, swaps, roster publishing
5. **Mobile App Integration**: Mobile clock in/out with GPS verification
6. **Advanced Algorithms**: Optimize roster generation based on workload, skills, preferences
7. **Shift Patterns**: Define repeating shift patterns (e.g., 4 days on, 2 days off)
8. **Cost Analysis**: Calculate labor costs based on shifts and overtime
9. **Compliance Tracking**: Monitor rest periods, maximum hours per regulations
10. **Shift Bidding**: Allow employees to bid on available shifts

## Testing

Example test scenarios:

```javascript
// Test shift conflict detection
// Test overtime calculation
// Test roster generation
// Test shift swap workflow
// Test staffing level calculations
```

## Support

For issues or questions, contact the development team or refer to the main Hospital ERP documentation.

---

**Implementation Complete** ✓

All components have been successfully implemented and integrated into the Hospital ERP system.
