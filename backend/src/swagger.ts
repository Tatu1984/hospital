import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hospital ERP API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the Hospital ERP Management System',
      contact: {
        name: 'API Support',
        email: 'support@hospitalerp.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server'
      },
      {
        url: 'https://api.hospitalerp.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /api/auth/login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 10 }
          }
        },
        Patient: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            uhid: { type: 'string', example: 'UHID-001' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            dateOfBirth: { type: 'string', format: 'date' },
            gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
            bloodGroup: { type: 'string', enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
            phone: { type: 'string', example: '+91-9876543210' },
            email: { type: 'string', format: 'email' },
            address: { type: 'string' },
            emergencyContact: { type: 'string' },
            medicalHistory: { type: 'string' },
            allergies: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Doctor: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            employeeId: { type: 'string', example: 'EMP-001' },
            firstName: { type: 'string', example: 'Dr. Jane' },
            lastName: { type: 'string', example: 'Smith' },
            specialization: { type: 'string', example: 'Cardiology' },
            qualification: { type: 'string', example: 'MBBS, MD' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            consultationFee: { type: 'number', example: 500 },
            department: { type: 'string', example: 'Cardiology' },
            status: { type: 'string', enum: ['Active', 'Inactive', 'On Leave'] }
          }
        },
        Appointment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            patientId: { type: 'string', format: 'uuid' },
            doctorId: { type: 'string', format: 'uuid' },
            appointmentDate: { type: 'string', format: 'date' },
            appointmentTime: { type: 'string', example: '10:00' },
            type: { type: 'string', enum: ['OPD', 'Follow-up', 'Emergency', 'Teleconsultation'] },
            status: { type: 'string', enum: ['Scheduled', 'Checked-in', 'In Progress', 'Completed', 'Cancelled', 'No Show'] },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Bill: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            billNumber: { type: 'string', example: 'BILL-001' },
            patientId: { type: 'string', format: 'uuid' },
            totalAmount: { type: 'number', example: 5000 },
            discount: { type: 'number', example: 500 },
            tax: { type: 'number', example: 225 },
            netAmount: { type: 'number', example: 4725 },
            paidAmount: { type: 'number', example: 4725 },
            paymentStatus: { type: 'string', enum: ['Pending', 'Partial', 'Paid', 'Refunded'] },
            paymentMethod: { type: 'string', enum: ['Cash', 'Card', 'UPI', 'Insurance', 'Credit'] },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        LabOrder: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            orderNumber: { type: 'string', example: 'LAB-001' },
            patientId: { type: 'string', format: 'uuid' },
            testName: { type: 'string', example: 'Complete Blood Count' },
            status: { type: 'string', enum: ['Ordered', 'Sample Collected', 'Processing', 'Completed', 'Cancelled'] },
            priority: { type: 'string', enum: ['Routine', 'Urgent', 'STAT'] },
            result: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        IPDAdmission: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            admissionNumber: { type: 'string', example: 'ADM-001' },
            patientId: { type: 'string', format: 'uuid' },
            wardId: { type: 'string', format: 'uuid' },
            bedId: { type: 'string', format: 'uuid' },
            admissionDate: { type: 'string', format: 'date-time' },
            dischargeDate: { type: 'string', format: 'date-time' },
            diagnosis: { type: 'string' },
            status: { type: 'string', enum: ['Active', 'Discharged', 'Transferred', 'LAMA', 'Expired'] }
          }
        },
        Medicine: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Paracetamol 500mg' },
            genericName: { type: 'string', example: 'Acetaminophen' },
            category: { type: 'string', example: 'Analgesic' },
            manufacturer: { type: 'string' },
            unitPrice: { type: 'number', example: 10 },
            stockQuantity: { type: 'integer', example: 500 },
            reorderLevel: { type: 'integer', example: 100 },
            expiryDate: { type: 'string', format: 'date' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string', example: 'admin' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            roles: {
              type: 'array',
              items: { type: 'string' },
              example: ['ADMIN', 'DOCTOR']
            },
            status: { type: 'string', enum: ['Active', 'Inactive', 'Suspended'] }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'admin' },
            password: { type: 'string', format: 'password', example: 'password123' }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/User' }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        NotFoundError: {
          description: 'The specified resource was not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ValidationError: {
          description: 'Invalid input data',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Patients', description: 'Patient management operations' },
      { name: 'Doctors', description: 'Doctor management operations' },
      { name: 'Appointments', description: 'Appointment scheduling and management' },
      { name: 'Billing', description: 'Billing and payment operations' },
      { name: 'Laboratory', description: 'Lab orders and results management' },
      { name: 'Pharmacy', description: 'Pharmacy and medicine management' },
      { name: 'IPD', description: 'Inpatient department operations' },
      { name: 'OPD', description: 'Outpatient department operations' },
      { name: 'Inventory', description: 'Inventory management operations' },
      { name: 'HR', description: 'Human resources management' },
      { name: 'Reports', description: 'Report generation endpoints' },
      { name: 'System', description: 'System health and configuration' }
    ]
  },
  apis: ['./src/server.ts', './src/routes/*.ts']
};

export const swaggerSpec = swaggerJSDoc(options);

// API Routes Documentation
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user and get JWT token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Get all patients with pagination
 *     tags: [Patients]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or UHID
 *     responses:
 *       200:
 *         description: List of patients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Patient'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *   post:
 *     summary: Create a new patient
 *     tags: [Patients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Patient'
 *     responses:
 *       201:
 *         description: Patient created successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     summary: Get patient by ID
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Patient details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   put:
 *     summary: Update patient
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Patient'
 *     responses:
 *       200:
 *         description: Patient updated
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   delete:
 *     summary: Delete patient
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Patient deleted
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/doctors:
 *   get:
 *     summary: Get all doctors
 *     tags: [Doctors]
 *     parameters:
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *         description: Filter by specialization
 *     responses:
 *       200:
 *         description: List of doctors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Doctor'
 *   post:
 *     summary: Create a new doctor
 *     tags: [Doctors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Doctor'
 *     responses:
 *       201:
 *         description: Doctor created successfully
 */

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Get all appointments
 *     tags: [Appointments]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by date
 *       - in: query
 *         name: doctorId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by doctor
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Scheduled, Checked-in, In Progress, Completed, Cancelled]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of appointments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Appointment'
 *   post:
 *     summary: Create a new appointment
 *     tags: [Appointments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Appointment'
 *     responses:
 *       201:
 *         description: Appointment created
 */

/**
 * @swagger
 * /api/billing:
 *   get:
 *     summary: Get all bills
 *     tags: [Billing]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Partial, Paid, Refunded]
 *         description: Filter by payment status
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by patient
 *     responses:
 *       200:
 *         description: List of bills
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Bill'
 *   post:
 *     summary: Create a new bill
 *     tags: [Billing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Bill'
 *     responses:
 *       201:
 *         description: Bill created
 */

/**
 * @swagger
 * /api/lab-orders:
 *   get:
 *     summary: Get all lab orders
 *     tags: [Laboratory]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Ordered, Sample Collected, Processing, Completed, Cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [Routine, Urgent, STAT]
 *         description: Filter by priority
 *     responses:
 *       200:
 *         description: List of lab orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LabOrder'
 *   post:
 *     summary: Create a new lab order
 *     tags: [Laboratory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LabOrder'
 *     responses:
 *       201:
 *         description: Lab order created
 */

/**
 * @swagger
 * /api/pharmacy/medicines:
 *   get:
 *     summary: Get all medicines
 *     tags: [Pharmacy]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Show only low stock items
 *     responses:
 *       200:
 *         description: List of medicines
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Medicine'
 *   post:
 *     summary: Add a new medicine
 *     tags: [Pharmacy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Medicine'
 *     responses:
 *       201:
 *         description: Medicine added
 */

/**
 * @swagger
 * /api/ipd/admissions:
 *   get:
 *     summary: Get all IPD admissions
 *     tags: [IPD]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Discharged, Transferred, LAMA, Expired]
 *         description: Filter by status
 *       - in: query
 *         name: wardId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by ward
 *     responses:
 *       200:
 *         description: List of admissions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/IPDAdmission'
 *   post:
 *     summary: Create a new admission
 *     tags: [IPD]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IPDAdmission'
 *     responses:
 *       201:
 *         description: Admission created
 */

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check API health status
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       enum: [healthy, unhealthy, unknown]
 *                     api:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 */

/**
 * @swagger
 * /api/ready:
 *   get:
 *     summary: Kubernetes readiness probe
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */

/**
 * @swagger
 * /api/live:
 *   get:
 *     summary: Kubernetes liveness probe
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is alive
 */
