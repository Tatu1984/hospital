# Hospital Management System (HMS)

A comprehensive, modular hospital management system built with modern web technologies.

## Tech Stack

**Backend:**
- Node.js + Express + TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication

**Frontend:**
- React + TypeScript
- Vite
- Ant Design UI Library
- React Router

## Quick Start

### 1. Start Database
```bash
docker-compose up -d
```

### 2. Setup Backend
```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

### 3. Setup Frontend (in new terminal)
```bash
cd frontend
npm install
npm run dev
```

### 4. Access Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Health:** http://localhost:8000/api/health

## Demo Credentials

- **Admin:** admin / password123
- **Doctor:** doctor1 / password123
- **Front Desk:** frontdesk / password123
- **Billing:** billing / password123
- **Lab:** lab / password123
- **Nurse:** nurse1 / password123

## Features

### Core Modules
- ✅ User Authentication & Authorization
- ✅ Patient Registration & Management
- ✅ OPD (Outpatient) Module
- ✅ Billing & Revenue Cycle
- ✅ Dashboard & Analytics
- 🚧 IPD (Inpatient) Module (Schema ready)
- 🚧 Laboratory (LIS) (Schema ready)
- 🚧 Radiology (RIS) (Schema ready)
- 🚧 Pharmacy (Schema ready)
- 🚧 HR & Biometric (Schema ready)

### Key Workflows
1. **Patient Registration** → Register new patients with MRN generation
2. **OPD Consultation** → Complete EMR with vitals, examination, prescription
3. **Billing** → Create invoices and collect payments
4. **Dashboard** → Real-time statistics and KPIs

## Architecture Highlights

- **Multi-tenant** architecture (tenant → branch → department)
- **Module-based** licensing (enable/disable per branch)
- **Role-based** access control
- **Edge-ready** design (prepared for offline sync)
- **Audit logging** built-in
- **Scalable** from small clinics to large hospital chains

## Database Schema

The system includes comprehensive entities for:
- Tenants, Branches, Departments, Modules
- Patients, Encounters, Admissions
- OPD Notes, IPD Notes, Prescriptions
- Orders (Lab/Radiology/Pharmacy), Results
- Invoices, Payments
- Users, Roles, Permissions
- Attendance Logs, Audit Logs
- Feedback, Quality Management

## API Endpoints

### Auth
- POST `/api/auth/login` - User login

### Patients
- GET `/api/patients` - List patients (with search)
- POST `/api/patients` - Register new patient
- GET `/api/patients/:id` - Get patient details

### Encounters
- GET `/api/encounters` - List encounters
- POST `/api/encounters` - Create encounter

### OPD
- GET `/api/opd-notes/:encounterId` - Get OPD notes
- POST `/api/opd-notes` - Create OPD note

### Billing
- GET `/api/invoices` - List invoices
- POST `/api/invoices` - Create invoice
- POST `/api/invoices/:id/payment` - Record payment

### Dashboard
- GET `/api/dashboard/stats` - Get dashboard statistics

## Development

### Backend Scripts
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run migrate      # Run database migrations
npm run seed         # Seed initial data
npm run studio       # Open Prisma Studio
```

### Frontend Scripts
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Project Structure

```
hospitalerp/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── server.ts
│   │   └── seed.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.tsx
│   └── package.json
└── docker-compose.yml
```

## Next Steps

1. ✅ Basic patient management working
2. ✅ OPD consultation flow working
3. ✅ Billing working
4. 🚧 Complete IPD workflow
5. 🚧 Add Laboratory module
6. 🚧 Add Radiology module
7. 🚧 Add Pharmacy dispensing
8. 🚧 Add HR & Attendance
9. 🚧 Add Inventory management
10. 🚧 Implement edge sync mechanism

## License

Proprietary - Hospital ERP System
