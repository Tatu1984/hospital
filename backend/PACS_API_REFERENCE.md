# PACS API Reference Guide

Quick reference for all PACS API endpoints with request/response examples.

## Authentication

All endpoints require JWT authentication via Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Base URL
```
/api/radiology
```

---

## Study Management

### 1. Create Study

**Endpoint:** `POST /api/radiology/studies`

**Permission:** `radiology:create`

**Request:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "patientId": "660e8400-e29b-41d4-a716-446655440001",
  "modality": "CT",
  "studyDescription": "CT Chest with Contrast",
  "referringPhysician": "Dr. John Smith",
  "performingTechnician": "Sarah Johnson",
  "studyDate": "2025-01-15T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "orderId": "550e8400-e29b-41d4-a716-446655440000",
    "patientId": "660e8400-e29b-41d4-a716-446655440001",
    "accessionNumber": "ACC20250115A3F2B1",
    "studyInstanceUID": "1.2.840.1704462600000.abcd1234",
    "modality": "CT",
    "studyDescription": "CT Chest with Contrast",
    "referringPhysician": "Dr. John Smith",
    "performingTechnician": "Sarah Johnson",
    "status": "scheduled",
    "numberOfSeries": 0,
    "numberOfImages": 0,
    "studyDate": "2025-01-15T10:30:00Z",
    "createdAt": "2025-01-15T10:00:00Z",
    "patient": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Jane Doe",
      "mrn": "MRN123456",
      "dob": "1980-05-15",
      "gender": "FEMALE"
    }
  }
}
```

---

### 2. List Studies

**Endpoint:** `GET /api/radiology/studies`

**Permission:** `radiology:view`

**Query Parameters:**
- `patientId` (optional) - Filter by patient
- `modality` (optional) - Filter by modality (CR, CT, MR, US, XR, etc.)
- `status` (optional) - Filter by status (scheduled, in_progress, completed, reported)
- `dateFrom` (optional) - ISO datetime
- `dateTo` (optional) - ISO datetime
- `page` (optional, default: 1)
- `limit` (optional, default: 50)

**Request:**
```
GET /api/radiology/studies?modality=CT&status=completed&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "accessionNumber": "ACC20250115A3F2B1",
      "modality": "CT",
      "studyDescription": "CT Chest with Contrast",
      "status": "completed",
      "numberOfSeries": 3,
      "numberOfImages": 145,
      "studyDate": "2025-01-15T10:30:00Z",
      "patient": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Jane Doe",
        "mrn": "MRN123456"
      },
      "reports": [
        {
          "id": "880e8400-e29b-41d4-a716-446655440003",
          "status": "final",
          "reportedAt": "2025-01-15T14:30:00Z",
          "reportedBy": "990e8400-e29b-41d4-a716-446655440004"
        }
      ]
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### 3. Get Study Details

**Endpoint:** `GET /api/radiology/studies/:id`

**Permission:** `radiology:view`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "accessionNumber": "ACC20250115A3F2B1",
    "studyInstanceUID": "1.2.840.1704462600000.abcd1234",
    "modality": "CT",
    "studyDescription": "CT Chest with Contrast",
    "status": "completed",
    "numberOfSeries": 3,
    "numberOfImages": 145,
    "storageSize": 145000000,
    "studyDate": "2025-01-15T10:30:00Z",
    "patient": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Jane Doe",
      "mrn": "MRN123456",
      "dob": "1980-05-15",
      "gender": "FEMALE",
      "contact": "+1234567890"
    },
    "order": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "orderType": "radiology",
      "orderedBy": "Dr. Smith",
      "orderedAt": "2025-01-15T09:00:00Z"
    },
    "series": [
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440005",
        "seriesNumber": 1,
        "modality": "CT",
        "seriesDescription": "Axial",
        "bodyPart": "Chest",
        "_count": {
          "images": 50
        }
      }
    ],
    "reports": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "reportType": "final",
        "status": "final",
        "findings": "Detailed findings...",
        "impression": "Clinical impression...",
        "reportedAt": "2025-01-15T14:30:00Z"
      }
    ]
  }
}
```

---

### 4. Update Study Status

**Endpoint:** `PUT /api/radiology/studies/:id/status`

**Permission:** `radiology:edit`

**Request:**
```json
{
  "status": "in_progress"
}
```

**Valid Statuses:**
- `scheduled`
- `in_progress`
- `completed`
- `reported`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "status": "in_progress",
    "updatedAt": "2025-01-15T11:00:00Z"
  }
}
```

---

## Series Management

### 5. Add Series to Study

**Endpoint:** `POST /api/radiology/studies/:studyId/series`

**Permission:** `radiology:create`

**Request:**
```json
{
  "studyId": "770e8400-e29b-41d4-a716-446655440002",
  "seriesNumber": 1,
  "modality": "CT",
  "seriesDescription": "Axial CT Chest",
  "bodyPart": "Chest",
  "seriesInstanceUID": "1.2.840.1704462610000.series001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440005",
    "studyId": "770e8400-e29b-41d4-a716-446655440002",
    "seriesNumber": 1,
    "modality": "CT",
    "seriesDescription": "Axial CT Chest",
    "bodyPart": "Chest",
    "seriesInstanceUID": "1.2.840.1704462610000.series001",
    "numberOfImages": 0,
    "createdAt": "2025-01-15T10:35:00Z"
  }
}
```

---

## Image Management

### 6. Upload Image to Series

**Endpoint:** `POST /api/radiology/series/:seriesId/images`

**Permission:** `radiology:upload`

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `image` (file) - Image file (DICOM, JPEG, PNG)
- `studyId` (string) - Study UUID
- `instanceNumber` (number) - Image instance number
- `imageType` (string, optional) - "ORIGINAL" or "DERIVED"
- `sopInstanceUID` (string, optional)
- `rows` (number, optional) - Image height
- `columns` (number, optional) - Image width
- `bitsAllocated` (number, optional) - Bits per pixel
- `windowCenter` (number, optional) - DICOM window center
- `windowWidth` (number, optional) - DICOM window width

**cURL Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "image=@chest-ct-001.dcm" \
  -F "studyId=770e8400-e29b-41d4-a716-446655440002" \
  -F "instanceNumber=1" \
  -F "imageType=ORIGINAL" \
  -F "rows=512" \
  -F "columns=512" \
  -F "windowCenter=40" \
  -F "windowWidth=400" \
  http://localhost:3000/api/radiology/series/aa0e8400-e29b-41d4-a716-446655440005/images
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bb0e8400-e29b-41d4-a716-446655440006",
    "seriesId": "aa0e8400-e29b-41d4-a716-446655440005",
    "sopInstanceUID": "1.2.840.1704462620000.image001",
    "instanceNumber": 1,
    "imageType": "ORIGINAL",
    "filePath": "/uploads/radiology/770e8400.../1704462620000-abcd1234.dcm",
    "fileSize": 524288,
    "rows": 512,
    "columns": 512,
    "windowCenter": 40,
    "windowWidth": 400,
    "createdAt": "2025-01-15T10:40:00Z"
  }
}
```

---

### 7. Upload Image Directly to Study

**Endpoint:** `POST /api/radiology/studies/:studyId/upload`

**Permission:** `radiology:upload`

**Note:** Automatically creates series if needed

**Form Fields:**
- `image` (file) - Image file
- `seriesNumber` (number, default: 1)
- `instanceNumber` (number)
- Other fields same as above

---

### 8. Get Study Images (for Viewer)

**Endpoint:** `GET /api/radiology/studies/:id/images`

**Permission:** `radiology:view`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "accessionNumber": "ACC20250115A3F2B1",
    "patient": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Jane Doe",
      "mrn": "MRN123456"
    },
    "series": [
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440005",
        "seriesNumber": 1,
        "seriesDescription": "Axial CT Chest",
        "images": [
          {
            "id": "bb0e8400-e29b-41d4-a716-446655440006",
            "instanceNumber": 1,
            "filePath": "/uploads/radiology/.../image001.dcm",
            "rows": 512,
            "columns": 512,
            "windowCenter": 40,
            "windowWidth": 400,
            "annotations": [
              {
                "id": "cc0e8400-e29b-41d4-a716-446655440007",
                "type": "measurement",
                "label": "Lesion: 2.5cm"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

### 9. Serve Image File

**Endpoint:** `GET /api/radiology/images/:id/file`

**Permission:** `radiology:view`

**Response:** Binary image data with appropriate Content-Type
- DICOM: `application/dicom`
- JPEG: `image/jpeg`
- PNG: `image/png`

**HTML Example:**
```html
<img src="/api/radiology/images/bb0e8400-e29b-41d4-a716-446655440006/file" />
```

---

## Annotations

### 10. Add Annotation to Image

**Endpoint:** `POST /api/radiology/images/:imageId/annotations`

**Permission:** `radiology:annotate`

**Request (Measurement):**
```json
{
  "imageId": "bb0e8400-e29b-41d4-a716-446655440006",
  "type": "measurement",
  "coordinates": {
    "points": [
      {"x": 100, "y": 150},
      {"x": 200, "y": 150}
    ]
  },
  "label": "Lesion diameter: 5.2cm",
  "color": "#FF0000",
  "createdBy": "user-id"
}
```

**Request (Circle):**
```json
{
  "imageId": "bb0e8400-e29b-41d4-a716-446655440006",
  "type": "circle",
  "coordinates": {
    "x": 250,
    "y": 200,
    "width": 50,
    "height": 50
  },
  "label": "Region of interest",
  "color": "#00FF00",
  "createdBy": "user-id"
}
```

**Annotation Types:**
- `text` - Text annotation
- `arrow` - Arrow pointer
- `circle` - Circle/ellipse
- `measurement` - Distance measurement
- `roi` - Region of interest

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cc0e8400-e29b-41d4-a716-446655440007",
    "imageId": "bb0e8400-e29b-41d4-a716-446655440006",
    "type": "measurement",
    "coordinates": {
      "points": [
        {"x": 100, "y": 150},
        {"x": 200, "y": 150}
      ]
    },
    "label": "Lesion diameter: 5.2cm",
    "color": "#FF0000",
    "createdBy": "user-id",
    "createdAt": "2025-01-15T11:00:00Z"
  }
}
```

---

### 11. Get Image Annotations

**Endpoint:** `GET /api/radiology/images/:id/annotations`

**Permission:** `radiology:view`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440007",
      "type": "measurement",
      "label": "Lesion diameter: 5.2cm",
      "coordinates": {...},
      "createdAt": "2025-01-15T11:00:00Z"
    }
  ]
}
```

---

## Reports

### 12. Create Radiology Report

**Endpoint:** `POST /api/radiology/studies/:studyId/report`

**Permission:** `radiology:report`

**Request:**
```json
{
  "studyId": "770e8400-e29b-41d4-a716-446655440002",
  "reportType": "final",
  "findings": "CT scan of the chest demonstrates:\n1. No acute pulmonary embolism.\n2. Clear lung fields bilaterally.\n3. Normal mediastinal contours.\n4. No pleural effusion or pneumothorax.",
  "impression": "Normal CT chest examination.",
  "recommendations": "No further imaging needed at this time. Clinical correlation recommended.",
  "reportedBy": "radiologist-user-id",
  "templateUsed": "template-id-optional"
}
```

**Report Types:**
- `preliminary` - Initial draft report
- `final` - Final verified report
- `addendum` - Addition to existing report

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "studyId": "770e8400-e29b-41d4-a716-446655440002",
    "reportType": "final",
    "findings": "CT scan of the chest demonstrates...",
    "impression": "Normal CT chest examination.",
    "recommendations": "No further imaging needed...",
    "reportedBy": "radiologist-user-id",
    "status": "draft",
    "reportedAt": "2025-01-15T14:30:00Z"
  }
}
```

---

### 13. Update Report

**Endpoint:** `PUT /api/radiology/reports/:id`

**Permission:** `radiology:report`

**Request:**
```json
{
  "findings": "Updated findings...",
  "impression": "Updated impression...",
  "status": "final",
  "verifiedBy": "senior-radiologist-id",
  "verifiedAt": "2025-01-15T15:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "status": "final",
    "verifiedBy": "senior-radiologist-id",
    "verifiedAt": "2025-01-15T15:00:00Z",
    "updatedAt": "2025-01-15T15:00:00Z"
  }
}
```

---

## Report Templates

### 14. Get Report Templates

**Endpoint:** `GET /api/radiology/report-templates`

**Permission:** `radiology:view`

**Query Parameters:**
- `modality` (optional) - Filter by modality
- `bodyPart` (optional) - Filter by body part
- `isActive` (optional) - Filter active/inactive

**Request:**
```
GET /api/radiology/report-templates?modality=CT&bodyPart=Chest
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "dd0e8400-e29b-41d4-a716-446655440008",
      "name": "CT Chest Normal",
      "modality": "CT",
      "bodyPart": "Chest",
      "content": "CT scan of the {bodyPart} demonstrates:\n{findings}\n\nImpression:\n{impression}",
      "isActive": true,
      "createdAt": "2025-01-10T10:00:00Z"
    }
  ]
}
```

---

### 15. Create Report Template

**Endpoint:** `POST /api/radiology/report-templates`

**Permission:** `radiology:manage`

**Request:**
```json
{
  "name": "CT Chest with Contrast",
  "modality": "CT",
  "bodyPart": "Chest",
  "content": "TECHNIQUE: CT chest performed with intravenous contrast.\n\nFINDINGS:\n{findings}\n\nIMPRESSION:\n{impression}\n\nRECOMMENDATIONS:\n{recommendations}",
  "createdBy": "user-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "dd0e8400-e29b-41d4-a716-446655440008",
    "name": "CT Chest with Contrast",
    "modality": "CT",
    "bodyPart": "Chest",
    "content": "TECHNIQUE: CT chest performed...",
    "isActive": true,
    "createdBy": "user-id",
    "createdAt": "2025-01-15T16:00:00Z"
  }
}
```

---

### 16. Update Template

**Endpoint:** `PUT /api/radiology/report-templates/:id`

**Permission:** `radiology:manage`

**Request:**
```json
{
  "name": "Updated Template Name",
  "content": "Updated template content...",
  "isActive": true
}
```

---

### 17. Delete Template (Soft Delete)

**Endpoint:** `DELETE /api/radiology/report-templates/:id`

**Permission:** `radiology:manage`

**Response:**
```json
{
  "success": true,
  "message": "Template deactivated successfully",
  "data": {
    "id": "dd0e8400-e29b-41d4-a716-446655440008",
    "isActive": false
  }
}
```

---

## Utilities

### 18. Get Supported Modalities

**Endpoint:** `GET /api/radiology/modalities`

**Permission:** `radiology:view`

**Response:**
```json
{
  "success": true,
  "data": {
    "CR": "Computed Radiography",
    "CT": "Computed Tomography",
    "MR": "Magnetic Resonance",
    "US": "Ultrasound",
    "XR": "X-Ray",
    "DX": "Digital X-Ray",
    "MG": "Mammography",
    "PT": "Positron Emission Tomography",
    "NM": "Nuclear Medicine",
    "RF": "Fluoroscopy",
    "OT": "Other"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "modality",
      "message": "Invalid modality. Must be one of: CR, CT, MR, US, XR, ..."
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Study not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details (in development mode)"
}
```

---

## Rate Limiting

All endpoints are subject to rate limiting:
- General endpoints: 100 requests per 15 minutes
- Upload endpoints: 20 requests per 15 minutes

## File Size Limits

- DICOM files: 100MB (configurable via `MAX_DICOM_SIZE_MB`)
- Standard images: 5MB

## CORS

CORS is enabled for configured origins. See server configuration for details.

---

## Complete Workflow Example

```javascript
// 1. Create a study
const studyResponse = await fetch('/api/radiology/studies', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderId: orderUuid,
    patientId: patientUuid,
    modality: 'CT',
    studyDescription: 'CT Chest with Contrast'
  })
});
const study = await studyResponse.json();

// 2. Upload images
const formData = new FormData();
formData.append('image', dicomFile);
formData.append('studyId', study.data.id);
formData.append('instanceNumber', '1');

await fetch(`/api/radiology/studies/${study.data.id}/upload`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
  body: formData
});

// 3. Create report
await fetch(`/api/radiology/studies/${study.data.id}/report`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reportType: 'final',
    findings: 'Detailed findings...',
    impression: 'Clinical impression...',
    reportedBy: radiologistId
  })
});
```

---

**For more information, see PACS_IMPLEMENTATION.md**
