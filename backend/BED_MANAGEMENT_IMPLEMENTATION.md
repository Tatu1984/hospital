# Bed Conflict Detection Implementation

This document describes the bed conflict detection and management system implemented for the Hospital ERP.

## Overview

The bed management system provides comprehensive functionality for:
- Checking bed availability in real-time
- Detecting and preventing bed booking conflicts
- Managing bed reservations for scheduled admissions
- Tracking bed assignment history
- Supporting bed transfers with status management

## Database Changes

### New Model: BedReservation

Added to Prisma schema at line 2035:

```prisma
model BedReservation {
  id             String    @id @default(uuid())
  bedId          String
  patientId      String
  reservedFrom   DateTime
  reservedUntil  DateTime
  status         String    @default("active") // active, cancelled, completed
  admissionId    String?
  remarks        String?
  createdBy      String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  bed            Bed       @relation(fields: [bedId], references: [id])
  patient        Patient   @relation(fields: [patientId], references: [id])

  @@index([bedId, status])
  @@index([patientId])
  @@index([reservedFrom, reservedUntil])
  @@map("bed_reservations")
}
```

### Updated Models

1. **Bed Model** - Added relation:
   ```prisma
   reservations BedReservation[]
   ```

2. **Patient Model** - Added relation:
   ```prisma
   bedReservations BedReservation[]
   ```

## Migration Steps

Run the following command to apply database changes:

```bash
npx prisma migrate dev --name add_bed_reservation_system
```

Or for production:

```bash
npx prisma migrate deploy
```

Then regenerate Prisma client:

```bash
npx prisma generate
```

## New Files Created

### 1. Service Layer
**File:** `/src/services/bedManagement.ts`

Core business logic for bed management:
- `checkBedAvailability(bedId, fromDate, toDate?)` - Check if bed is available
- `findAvailableBeds(wardId, category, fromDate, toDate?)` - Find all available beds
- `detectConflicts(bedId, admissionId)` - Detect bed conflicts
- `getBedHistory(bedId, limit)` - Get bed assignment history
- `reserveBed(bedId, patientId, from, until, admissionId?)` - Reserve a bed
- `cancelReservation(reservationId)` - Cancel reservation
- `updateBedStatus(bedId, status)` - Update bed status
- `transferBed(admissionId, newBedId, oldBedId, reason?)` - Transfer patient

### 2. API Routes
**File:** `/src/routes/beds.ts`

New endpoints:
- `GET /api/beds/available` - Get available beds with filters
- `POST /api/beds/:id/check-availability` - Check specific bed availability
- `POST /api/beds/:id/reserve` - Reserve a bed
- `DELETE /api/beds/reservations/:id` - Cancel reservation
- `GET /api/beds/:id/history` - Get bed assignment history
- `PATCH /api/beds/:id/status` - Update bed status
- `POST /api/beds/transfer` - Transfer patient to new bed
- `GET /api/beds/:id/conflicts/:admissionId` - Check for conflicts
- `GET /api/beds/reservations` - Get all reservations

### 3. Validation Schemas
**File:** `/src/validators/index.ts` (lines 845-906)

Added validators:
- `checkBedAvailabilitySchema`
- `findAvailableBedsSchema`
- `reserveBedSchema`
- `updateBedStatusSchema`
- `transferBedSchema`
- `getBedHistorySchema`
- `getAvailableBedsQuerySchema`

## Updated Features

### 1. Enhanced Admission Creation
**File:** `/src/server.ts` (line 4488)

The admission creation endpoint now:
- Checks bed availability before creating admission
- Prevents double-booking with conflict detection
- Returns detailed conflict information on failure
- Validates insurance and pre-authorization
- Automatically cancels matching reservations on admission
- Updates bed status to 'occupied'

**Request Body:**
```json
{
  "encounterId": "uuid",
  "patientId": "uuid",
  "bedId": "uuid",
  "diagnosis": "string",
  "patientInsuranceId": "uuid (optional)",
  "preAuthorizationId": "uuid (optional)"
}
```

**Response on Conflict (409):**
```json
{
  "success": false,
  "error": "Bed is not available",
  "reason": "Bed is currently occupied by patient John Doe (MRN: MRN001)",
  "conflict": {
    "hasConflict": true,
    "conflictType": "occupied",
    "currentAdmission": {
      "id": "uuid",
      "patientId": "uuid",
      "patientName": "John Doe",
      "admissionDate": "2024-01-01T00:00:00Z",
      "status": "active"
    }
  }
}
```

### 2. Bed Discharge
The existing discharge endpoint already updates bed status to 'dirty' (requires cleaning).

## Bed Status Management

The system supports the following bed statuses:

1. **vacant** - Bed is clean and ready for use
2. **occupied** - Bed is currently assigned to a patient
3. **reserved** - Bed is reserved for future admission
4. **maintenance** - Bed is under maintenance
5. **dirty** - Bed requires cleaning (set after discharge)

## RBAC Permissions

Added permissions to `/src/routes/index.ts`:

```typescript
'GET /api/beds/available': ['beds:view'],
'POST /api/beds/:id/check-availability': ['beds:view'],
'POST /api/beds/:id/reserve': ['beds:reserve'],
'DELETE /api/beds/reservations/:id': ['beds:reserve'],
'GET /api/beds/:id/history': ['beds:view'],
'PATCH /api/beds/:id/status': ['beds:manage'],
'POST /api/beds/transfer': ['beds:manage'],
'GET /api/beds/:id/conflicts/:admissionId': ['beds:view'],
'GET /api/beds/reservations': ['beds:view'],
```

Required permissions:
- `beds:view` - View bed availability and history
- `beds:reserve` - Reserve and cancel bed reservations
- `beds:manage` - Update bed status and transfer patients

## Usage Examples

### 1. Check Bed Availability

```bash
POST /api/beds/{bedId}/check-availability
Content-Type: application/json

{
  "fromDate": "2024-12-31T00:00:00Z",
  "toDate": "2025-01-05T00:00:00Z"
}
```

### 2. Find Available Beds

```bash
GET /api/beds/available?wardId={uuid}&category=general&fromDate=2024-12-31T00:00:00Z
```

### 3. Reserve a Bed

```bash
POST /api/beds/{bedId}/reserve
Content-Type: application/json

{
  "patientId": "uuid",
  "reservedFrom": "2024-12-31T00:00:00Z",
  "reservedUntil": "2025-01-05T00:00:00Z",
  "remarks": "Scheduled surgery admission"
}
```

### 4. Transfer Patient to New Bed

```bash
POST /api/beds/transfer
Content-Type: application/json

{
  "admissionId": "uuid",
  "newBedId": "uuid",
  "reason": "Patient requested private room"
}
```

### 5. Update Bed Status

```bash
PATCH /api/beds/{bedId}/status
Content-Type: application/json

{
  "status": "maintenance"
}
```

### 6. Get Bed History

```bash
GET /api/beds/{bedId}/history?limit=50
```

### 7. View All Reservations

```bash
GET /api/beds/reservations?status=active&fromDate=2024-12-31T00:00:00Z
```

## Error Handling

The system provides comprehensive error handling:

### Conflict Errors (409)
Returned when bed is not available due to:
- Existing admission
- Overlapping reservation
- Bed under maintenance

### Validation Errors (400)
Returned for:
- Invalid date ranges
- Expired insurance/pre-authorization
- Invalid bed status transitions

### Not Found Errors (404)
Returned when:
- Bed ID doesn't exist
- Admission not found
- Reservation not found

## Testing Checklist

- [ ] Run database migration
- [ ] Verify BedReservation table created
- [ ] Test bed availability check
- [ ] Test admission with occupied bed (should fail)
- [ ] Test bed reservation creation
- [ ] Test overlapping reservation (should fail)
- [ ] Test admission with valid reservation
- [ ] Test bed transfer
- [ ] Test bed status updates
- [ ] Test bed history retrieval
- [ ] Verify RBAC permissions work correctly

## Integration Notes

### Frontend Integration

The frontend should:
1. Check bed availability before showing bed selection
2. Display conflict details when bed is unavailable
3. Support reservation workflow for scheduled admissions
4. Show bed history for housekeeping and maintenance
5. Handle 409 conflict responses gracefully

### Housekeeping Integration

The bed status flow supports housekeeping:
1. Patient discharged → Bed status = 'dirty'
2. Housekeeping cleans → Bed status = 'vacant'
3. Maintenance needed → Bed status = 'maintenance'
4. Maintenance complete → Bed status = 'vacant'

## Performance Considerations

1. **Indexes**: Added indexes on frequently queried fields:
   - `bedId` and `status` for quick availability checks
   - `reservedFrom` and `reservedUntil` for date range queries

2. **Query Optimization**:
   - Use `include` to minimize database round-trips
   - Limit history queries with configurable limits

3. **Caching Opportunities**:
   - Cache available beds for short periods (1-5 minutes)
   - Invalidate cache on status changes

## Future Enhancements

Potential improvements:
- Real-time bed availability dashboard via WebSockets
- Automatic reservation expiry cleanup job
- Bed allocation algorithm based on patient preferences
- Integration with housekeeping task automation
- Bed utilization analytics and reporting
- Waiting list management for bed requests

## Support

For issues or questions, contact the development team or refer to the main Hospital ERP documentation.
