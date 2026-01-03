# PACS Quick Start Guide

Get the PACS system up and running in 5 minutes.

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Existing Hospital ERP backend setup

## Step 1: Database Migration

Run the migration to create PACS tables:

```bash
# Option A: Create a new migration (recommended for production)
npx prisma migrate dev --name add_pacs_system

# Option B: Push directly to database (faster for development)
npx prisma db push

# Generate Prisma client
npx prisma generate
```

This will create 6 new tables:
- `radiology_studies`
- `radiology_series`
- `radiology_images`
- `image_annotations`
- `radiology_reports`
- `radiology_report_templates`

## Step 2: Environment Configuration

Add to your `.env` file (optional, has defaults):

```env
# PACS Configuration
MAX_DICOM_SIZE_MB=100
UPLOAD_DIR=./uploads
```

## Step 3: Register Routes

Add the radiology routes to your main server file (usually `src/server.ts`):

```typescript
import radiologyRoutes from './routes/radiology';

// ... other imports

// Add PACS routes
app.use('/api/radiology', radiologyRoutes);
```

## Step 4: Create Upload Directories

The system auto-creates directories, but you can manually ensure they exist:

```bash
mkdir -p uploads/radiology
chmod 755 uploads/radiology
```

## Step 5: Test the System

### Create a Test Study

```bash
curl -X POST http://localhost:3000/api/radiology/studies \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "your-order-uuid",
    "patientId": "your-patient-uuid",
    "modality": "XR",
    "studyDescription": "Chest X-Ray PA"
  }'
```

### Upload a Test Image

```bash
curl -X POST http://localhost:3000/api/radiology/studies/STUDY_ID/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@test-xray.jpg" \
  -F "instanceNumber=1" \
  -F "seriesNumber=1"
```

### List Studies

```bash
curl -X GET "http://localhost:3000/api/radiology/studies?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Step 6: Verify Permissions

Ensure your users have the correct roles:

- **ADMIN** - Full PACS access
- **RADIOLOGY_TECH** - Can upload images, create reports
- **DOCTOR** - Can view studies and reports

To assign a RADIOLOGY_TECH role to a user:

```sql
UPDATE users
SET "roleIds" = ARRAY['RADIOLOGY_TECH']
WHERE email = 'radtech@hospital.com';
```

## Common Tasks

### Create a Report Template

```bash
curl -X POST http://localhost:3000/api/radiology/report-templates \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chest X-Ray Normal",
    "modality": "XR",
    "bodyPart": "Chest",
    "content": "FINDINGS:\n{findings}\n\nIMPRESSION:\n{impression}",
    "createdBy": "YOUR_USER_ID"
  }'
```

### Create a Report

```bash
curl -X POST http://localhost:3000/api/radiology/studies/STUDY_ID/report \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "final",
    "findings": "Clear lung fields. Normal heart size. No acute findings.",
    "impression": "Normal chest radiograph.",
    "reportedBy": "YOUR_USER_ID"
  }'
```

### Add an Annotation

```bash
curl -X POST http://localhost:3000/api/radiology/images/IMAGE_ID/annotations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "measurement",
    "coordinates": {
      "points": [{"x": 100, "y": 100}, {"x": 200, "y": 100}]
    },
    "label": "Cardiomegaly: 15cm",
    "color": "#FF0000",
    "createdBy": "YOUR_USER_ID"
  }'
```

## Troubleshooting

### Issue: "Study not found"
**Solution:** Make sure the study ID exists. List studies first:
```bash
GET /api/radiology/studies
```

### Issue: "No image file uploaded"
**Solution:** Ensure you're using `multipart/form-data` and the field name is `image`:
```bash
-F "image=@yourfile.jpg"
```

### Issue: "Insufficient permissions"
**Solution:** Check user roles. RADIOLOGY_TECH needs these permissions:
- radiology:view
- radiology:create
- radiology:upload
- radiology:annotate
- radiology:report

### Issue: "File too large"
**Solution:** Increase `MAX_DICOM_SIZE_MB` in `.env`:
```env
MAX_DICOM_SIZE_MB=200
```

### Issue: "Cannot find module '@prisma/client'"
**Solution:** Regenerate Prisma client:
```bash
npx prisma generate
```

## Testing Checklist

- [ ] Database migration successful
- [ ] Can create a study
- [ ] Can upload an image
- [ ] Can retrieve study with images
- [ ] Can add annotations
- [ ] Can create a report
- [ ] Can view images in browser
- [ ] Permissions work correctly
- [ ] File serving works (image URLs load)

## Performance Tips

1. **Add Database Indexes** - Already included in schema for:
   - patientId, orderId, status, studyDate
   - Speeds up common queries

2. **Use Pagination** - Always use `page` and `limit`:
   ```
   GET /api/radiology/studies?page=1&limit=50
   ```

3. **Filter Studies** - Use query parameters:
   ```
   GET /api/radiology/studies?modality=CT&status=completed
   ```

4. **Image Optimization** - Consider generating thumbnails for faster loading (future enhancement)

## Security Checklist

- [x] Authentication required on all routes
- [x] Permission-based access control
- [x] Input validation using Zod schemas
- [x] File type validation
- [x] File size limits
- [x] Secure random filenames
- [x] Audit logging

## Next Steps

1. **Frontend Integration**
   - Integrate a DICOM viewer (Cornerstone.js or OHIF)
   - Build study list interface
   - Create image viewer with annotations
   - Build report editor

2. **Advanced Features**
   - DICOM parsing (extract metadata automatically)
   - Thumbnail generation
   - DICOM send/receive (C-STORE, C-FIND)
   - Worklist integration
   - AI integration (lesion detection, etc.)

3. **Monitoring**
   - Set up logging alerts
   - Monitor storage usage
   - Track upload failures
   - Performance monitoring

## Sample Data

Create sample studies for testing:

```typescript
// Sample patient IDs and order IDs needed
const studies = [
  {
    modality: 'XR',
    studyDescription: 'Chest X-Ray PA and Lateral'
  },
  {
    modality: 'CT',
    studyDescription: 'CT Head without Contrast'
  },
  {
    modality: 'MR',
    studyDescription: 'MRI Brain with and without Contrast'
  },
  {
    modality: 'US',
    studyDescription: 'Abdominal Ultrasound'
  }
];
```

## Support

- **Implementation Guide:** `PACS_IMPLEMENTATION.md`
- **API Reference:** `PACS_API_REFERENCE.md`
- **Source Code:**
  - Service: `src/services/pacsService.ts`
  - Routes: `src/routes/radiology.ts`
  - Validators: `src/validators/index.ts` (PACS section)
  - Schema: `prisma/schema.prisma` (PACS models at end)

## Production Deployment

Before deploying to production:

1. **Run Migration**
   ```bash
   npx prisma migrate deploy
   ```

2. **Set Environment Variables**
   ```env
   MAX_DICOM_SIZE_MB=100
   UPLOAD_DIR=/var/hospital/uploads
   ```

3. **Configure Storage**
   - For cloud: Use S3/GCS instead of local filesystem
   - Update upload service to use cloud storage

4. **Backup Strategy**
   - Database: Regular PostgreSQL backups
   - Images: Backup upload directory regularly
   - Consider RAID storage for reliability

5. **Monitoring**
   - Set up disk space monitoring
   - Monitor upload success rates
   - Track study completion times

## Summary

You now have a fully functional PACS system with:
- ✅ Study management
- ✅ Image upload and storage
- ✅ Annotation support
- ✅ Report generation
- ✅ Template system
- ✅ Permission-based access
- ✅ REST API with 18 endpoints

Ready to start uploading and managing radiology images!

**Need help?** Check the detailed documentation in `PACS_IMPLEMENTATION.md` and `PACS_API_REFERENCE.md`.
