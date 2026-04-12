const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  ImageRun,
  TableOfContents,
  StyleLevel,
  LevelFormat,
  convertInchesToTwip,
  ShadingType,
} = require("docx");
const fs = require("fs");

// Professional color scheme
const COLORS = {
  primary: "1E3A5F",
  secondary: "2980B9",
  accent: "27AE60",
  warning: "F39C12",
  danger: "E74C3C",
  lightGray: "F5F5F5",
  darkGray: "333333",
  white: "FFFFFF",
};

// Helper function to create styled heading
function createHeading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    text: text,
    heading: level,
    spacing: { before: 400, after: 200 },
  });
}

// Helper function to create bullet point
function createBullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun(text)],
    bullet: { level },
    spacing: { before: 100, after: 100 },
  });
}

// Helper function to create normal paragraph
function createParagraph(text, options = {}) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: 24,
        ...options,
      }),
    ],
    spacing: { before: 120, after: 120 },
    alignment: options.alignment || AlignmentType.LEFT,
  });
}

// Helper function to create styled table
function createTable(headers, rows, options = {}) {
  const headerCells = headers.map(
    (header) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: header,
                bold: true,
                color: COLORS.white,
                size: 22,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        shading: { fill: COLORS.primary, type: ShadingType.SOLID },
        width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
      })
  );

  const dataRows = rows.map(
    (row, rowIndex) =>
      new TableRow({
        children: row.map(
          (cell, cellIndex) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: String(cell),
                      size: 20,
                    }),
                  ],
                  alignment: cellIndex === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                }),
              ],
              shading: {
                fill: rowIndex % 2 === 0 ? COLORS.white : COLORS.lightGray,
                type: ShadingType.SOLID,
              },
              width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
            })
        ),
      })
  );

  return new Table({
    rows: [new TableRow({ children: headerCells }), ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// Load images
const systemDataflowImage = fs.readFileSync("diagram_system_dataflow.png");
const patientJourneyImage = fs.readFileSync("diagram_patient_journey.png");
const architectureImage = fs.readFileSync("diagram_architecture.png");
const timelineImage = fs.readFileSync("diagram_timeline.png");

// Create the document
const doc = new Document({
  creator: "Hospital ERP Development Team",
  title: "Hospital ERP - Statement of Work",
  description: "Comprehensive Statement of Work for Hospital ERP System Development",
  styles: {
    default: {
      document: {
        run: {
          font: "Calibri",
          size: 24,
        },
      },
      heading1: {
        run: {
          font: "Calibri",
          size: 36,
          bold: true,
          color: COLORS.primary,
        },
        paragraph: {
          spacing: { before: 400, after: 200 },
        },
      },
      heading2: {
        run: {
          font: "Calibri",
          size: 30,
          bold: true,
          color: COLORS.secondary,
        },
        paragraph: {
          spacing: { before: 300, after: 150 },
        },
      },
      heading3: {
        run: {
          font: "Calibri",
          size: 26,
          bold: true,
          color: COLORS.darkGray,
        },
        paragraph: {
          spacing: { before: 200, after: 100 },
        },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Hospital ERP System - Statement of Work",
                  size: 20,
                  color: COLORS.secondary,
                  italics: true,
                }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Confidential | ",
                  size: 18,
                  color: COLORS.darkGray,
                }),
                new TextRun({
                  text: "Page ",
                  size: 18,
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  size: 18,
                }),
                new TextRun({
                  text: " of ",
                  size: 18,
                }),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  size: 18,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      children: [
        // ============ COVER PAGE ============
        new Paragraph({ spacing: { before: 2000 } }),
        new Paragraph({
          children: [
            new TextRun({
              text: "HOSPITAL ERP SYSTEM",
              bold: true,
              size: 72,
              color: COLORS.primary,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ spacing: { before: 400 } }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Statement of Work",
              size: 48,
              color: COLORS.secondary,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ spacing: { before: 800 } }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Enterprise Hospital Management Solution",
              size: 28,
              italics: true,
              color: COLORS.darkGray,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ spacing: { before: 1600 } }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Version 1.0",
              size: 24,
              bold: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Document Date: ${new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}`,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ spacing: { before: 1600 } }),
        new Paragraph({
          children: [
            new TextRun({
              text: "CONFIDENTIAL",
              bold: true,
              size: 28,
              color: COLORS.danger,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),

        // Page break before TOC
        new Paragraph({ children: [new PageBreak()] }),

        // ============ TABLE OF CONTENTS ============
        createHeading("Table of Contents", HeadingLevel.HEADING_1),
        new Paragraph({ spacing: { before: 200 } }),
        createParagraph("1. Executive Summary ..................................................... 3"),
        createParagraph("2. Feature List ............................................................. 4"),
        createParagraph("3. Technology Stack ....................................................... 9"),
        createParagraph("4. Data Flow Diagram ..................................................... 11"),
        createParagraph("5. Software Architecture ................................................ 14"),
        createParagraph("6. Plan of Action (Phase-wise Development) .................. 16"),
        createParagraph("7. Required Team Setup ................................................ 20"),
        createParagraph("8. Project Timeline ....................................................... 22"),
        createParagraph("9. API Documentation ................................................... 24"),
        createParagraph("10. Database Schema .................................................... 30"),
        createParagraph("11. Appendices ............................................................. 36"),

        // Page break
        new Paragraph({ children: [new PageBreak()] }),

        // ============ 1. EXECUTIVE SUMMARY ============
        createHeading("1. Executive Summary", HeadingLevel.HEADING_1),
        new Paragraph({ spacing: { before: 200 } }),
        createParagraph(
          "This Statement of Work (SoW) outlines the comprehensive development plan for a modern, enterprise-grade Hospital Enterprise Resource Planning (ERP) system. The solution is designed to digitize and streamline all hospital operations, from patient registration to billing, clinical workflows, inventory management, and administrative functions."
        ),
        new Paragraph({ spacing: { before: 200 } }),
        createHeading("1.1 Project Overview", HeadingLevel.HEADING_2),
        createParagraph(
          "The Hospital ERP is a full-featured hospital management system built with modern web technologies. It supports multi-tenant architecture, role-based access control, and is designed to handle the complex workflows of healthcare institutions of all sizes."
        ),
        new Paragraph({ spacing: { before: 200 } }),
        createHeading("1.2 Key Highlights", HeadingLevel.HEADING_2),
        createBullet("28+ fully functional modules covering all hospital departments"),
        createBullet("150+ RESTful API endpoints for seamless integration"),
        createBullet("65+ database entities with comprehensive data modeling"),
        createBullet("Multi-tenant architecture supporting multiple hospital branches"),
        createBullet("Role-based access control with 20 predefined roles and 142 permissions"),
        createBullet("HIPAA-compliant data encryption and security measures"),
        createBullet("Real-time updates via WebSocket integration"),
        createBullet("Comprehensive billing with Razorpay payment gateway integration"),
        createBullet("PDF/Excel export capabilities for reports"),
        new Paragraph({ spacing: { before: 200 } }),
        createHeading("1.3 Scope of Delivery", HeadingLevel.HEADING_2),
        createParagraph(
          "This SoW covers the complete development lifecycle including requirements analysis, system design, development, testing, deployment, and post-launch support for the Hospital ERP system."
        ),

        // Page break
        new Paragraph({ children: [new PageBreak()] }),

        // ============ 2. FEATURE LIST (REWRITTEN - NO STATUS) ============
        createHeading("2. Feature List", HeadingLevel.HEADING_1),
        new Paragraph({ spacing: { before: 200 } }),
        createParagraph(
          "The Hospital ERP system encompasses a comprehensive suite of modules designed to manage every aspect of hospital operations. Below is a detailed feature breakdown organized by functional area."
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.1 Patient Management", HeadingLevel.HEADING_2),
        createBullet("Patient Registration with automated MRN (Medical Record Number) generation"),
        createBullet("Comprehensive demographics capture (personal, contact, emergency contact)"),
        createBullet("Patient photo capture and document upload"),
        createBullet("Insurance information management and verification"),
        createBullet("Allergy and medical history recording"),
        createBullet("Duplicate patient detection and merge functionality"),
        createBullet("Patient search with advanced filters"),
        createBullet("Patient card and barcode generation"),
        createBullet("Family member linking"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.2 Appointment Scheduling", HeadingLevel.HEADING_2),
        createBullet("Multi-channel appointment booking (walk-in, phone, online)"),
        createBullet("Doctor availability and slot management"),
        createBullet("Department-wise scheduling"),
        createBullet("Appointment reminders via SMS/Email"),
        createBullet("Reschedule and cancellation management"),
        createBullet("Queue management and token generation"),
        createBullet("Waiting list management"),
        createBullet("Calendar view with drag-and-drop"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.3 Outpatient Department (OPD)", HeadingLevel.HEADING_2),
        createBullet("Patient check-in and queue management"),
        createBullet("Vital signs recording (BP, temperature, pulse, SpO2, weight, height)"),
        createBullet("SOAP notes documentation (Subjective, Objective, Assessment, Plan)"),
        createBullet("Chief complaint and history of present illness"),
        createBullet("Physical examination documentation"),
        createBullet("Diagnosis entry with ICD-10 coding"),
        createBullet("Prescription generation with drug database"),
        createBullet("Drug interaction and allergy alerts"),
        createBullet("Lab and radiology order placement"),
        createBullet("Referral to specialists"),
        createBullet("Follow-up appointment scheduling"),
        createBullet("Consultation summary and print"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.4 Inpatient Department (IPD)", HeadingLevel.HEADING_2),
        createBullet("Admission processing with bed assignment"),
        createBullet("Admission types (emergency, elective, transfer, referral)"),
        createBullet("Attending physician assignment"),
        createBullet("Daily clinical notes and progress notes"),
        createBullet("Treatment plan management"),
        createBullet("Daily charge capture"),
        createBullet("Bed transfer management"),
        createBullet("Discharge planning and summary"),
        createBullet("Discharge instructions"),
        createBullet("Against Medical Advice (AMA) documentation"),

        new Paragraph({ children: [new PageBreak()] }),

        createHeading("2.5 Emergency Department", HeadingLevel.HEADING_2),
        createBullet("Emergency patient registration with rapid entry"),
        createBullet("Triage assessment (5-level triage system)"),
        createBullet("Medico-Legal Case (MLC) registration and documentation"),
        createBullet("Priority-based patient queue"),
        createBullet("Emergency vitals and monitoring"),
        createBullet("Trauma documentation"),
        createBullet("Emergency medication administration"),
        createBullet("Admit to ward or discharge workflows"),
        createBullet("Death documentation and certificate generation"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.6 ICU/Critical Care", HeadingLevel.HEADING_2),
        createBullet("ICU bed management with equipment tracking"),
        createBullet("Continuous vital signs monitoring"),
        createBullet("Ventilator parameter recording"),
        createBullet("Hourly charting and flowsheets"),
        createBullet("Critical alerts and notifications"),
        createBullet("APACHE/SOFA scoring"),
        createBullet("Sedation and pain assessment scales"),
        createBullet("Input/output monitoring"),
        createBullet("Step-down and transfer protocols"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.7 Operation Theatre (OT)", HeadingLevel.HEADING_2),
        createBullet("Surgery scheduling and calendar"),
        createBullet("OT room and equipment management"),
        createBullet("Pre-operative assessment and checklist"),
        createBullet("Surgical safety checklist (WHO standards)"),
        createBullet("Procedure documentation"),
        createBullet("Implant and consumable tracking"),
        createBullet("Intra-operative notes"),
        createBullet("Post-operative instructions"),
        createBullet("Complication documentation"),
        createBullet("OT utilization reports"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.8 Anesthesia Management", HeadingLevel.HEADING_2),
        createBullet("Pre-anesthetic evaluation"),
        createBullet("Anesthesia consent documentation"),
        createBullet("Anesthesia plan and type selection"),
        createBullet("Drug and dosage recording"),
        createBullet("Intra-operative monitoring"),
        createBullet("Anesthesia chart with vital trends"),
        createBullet("Post-anesthesia care unit (PACU) notes"),
        createBullet("Anesthesia complications reporting"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.9 Laboratory Information System", HeadingLevel.HEADING_2),
        createBullet("Test catalog management with pricing"),
        createBullet("Lab order entry and requisition"),
        createBullet("Sample collection and tracking with barcode"),
        createBullet("Sample acceptance and rejection"),
        createBullet("Result entry with normal range comparison"),
        createBullet("Critical value alerts"),
        createBullet("Result verification workflow"),
        createBullet("Lab report generation and printing"),
        createBullet("Historical result trending"),
        createBullet("Quality control management"),
        createBullet("External lab integration"),

        new Paragraph({ children: [new PageBreak()] }),

        createHeading("2.10 Radiology Information System", HeadingLevel.HEADING_2),
        createBullet("Modality management (X-ray, CT, MRI, Ultrasound, etc.)"),
        createBullet("Radiology order entry"),
        createBullet("Study scheduling and worklist"),
        createBullet("Image storage and retrieval"),
        createBullet("Image annotation tools"),
        createBullet("Radiology reporting with templates"),
        createBullet("Report verification and sign-off"),
        createBullet("Critical findings alert"),
        createBullet("PACS integration (basic)"),
        createBullet("CD/DVD burning for patient images"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.11 Pharmacy Management", HeadingLevel.HEADING_2),
        createBullet("Drug master with formulations and strengths"),
        createBullet("Inventory management with batch tracking"),
        createBullet("Expiry tracking and alerts"),
        createBullet("Reorder level management"),
        createBullet("Purchase order and goods receipt"),
        createBullet("IP dispensing against prescriptions"),
        createBullet("OP pharmacy point-of-sale"),
        createBullet("Drug returns handling"),
        createBullet("Stock transfer between locations"),
        createBullet("Narcotic drug register"),
        createBullet("Drug utilization reports"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.12 Blood Bank Management", HeadingLevel.HEADING_2),
        createBullet("Donor registration and screening"),
        createBullet("Blood donation recording"),
        createBullet("Component separation tracking"),
        createBullet("Blood inventory by blood group and component"),
        createBullet("Cross-matching and compatibility testing"),
        createBullet("Blood requisition and issue"),
        createBullet("Transfusion reaction documentation"),
        createBullet("Expiry management"),
        createBullet("Donor deferral registry"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.13 Nursing Management", HeadingLevel.HEADING_2),
        createBullet("Nursing care plan creation (NANDA diagnoses)"),
        createBullet("Nursing goals and interventions"),
        createBullet("Intervention execution tracking"),
        createBullet("Care plan evaluation"),
        createBullet("Vital signs charting"),
        createBullet("Medication administration record (MAR)"),
        createBullet("5-rights verification for medication"),
        createBullet("Intake/output charting"),
        createBullet("Pain assessment and management"),
        createBullet("Fall risk assessment"),
        createBullet("Pressure ulcer (Braden scale) assessment"),
        createBullet("Shift handover notes"),
        createBullet("Nursing discharge summary"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.14 Bed & Ward Management", HeadingLevel.HEADING_2),
        createBullet("Ward and room configuration"),
        createBullet("Bed master with bed types"),
        createBullet("Real-time bed availability dashboard"),
        createBullet("Bed reservation"),
        createBullet("Patient-bed assignment"),
        createBullet("Bed transfer management"),
        createBullet("Bed blocking for maintenance"),
        createBullet("Occupancy reports and analytics"),

        new Paragraph({ children: [new PageBreak()] }),

        createHeading("2.15 Billing & Revenue Cycle", HeadingLevel.HEADING_2),
        createBullet("Service and tariff master"),
        createBullet("Package pricing and bundles"),
        createBullet("OPD billing"),
        createBullet("IPD billing with day-wise charges"),
        createBullet("Emergency billing"),
        createBullet("Pharmacy billing"),
        createBullet("Advance and deposit collection"),
        createBullet("Multiple payment modes (cash, card, UPI, online)"),
        createBullet("Payment gateway integration (Razorpay)"),
        createBullet("Discount and concession management"),
        createBullet("Bill splitting"),
        createBullet("Refund processing"),
        createBullet("Receipt and invoice printing"),
        createBullet("Revenue reports"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.16 Insurance & TPA Management", HeadingLevel.HEADING_2),
        createBullet("TPA/Insurance company master"),
        createBullet("Patient insurance policy capture"),
        createBullet("Real-time eligibility verification"),
        createBullet("Coverage limit tracking"),
        createBullet("Pre-authorization request and tracking"),
        createBullet("Claim submission"),
        createBullet("Claim status tracking"),
        createBullet("Settlement recording"),
        createBullet("Insurance utilization reports"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.17 Accounting & Finance", HeadingLevel.HEADING_2),
        createBullet("Chart of accounts management"),
        createBullet("Account groups and heads"),
        createBullet("Journal entry creation"),
        createBullet("Ledger posting"),
        createBullet("Fiscal year management"),
        createBullet("Day-end and period-end closing"),
        createBullet("Financial reports (Trial Balance, P&L, Balance Sheet)"),
        createBullet("Tally export integration"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.18 Commission & Revenue Sharing", HeadingLevel.HEADING_2),
        createBullet("Referral source management"),
        createBullet("Commission rate configuration"),
        createBullet("Commission calculation"),
        createBullet("Commission approval workflow"),
        createBullet("Payout management"),
        createBullet("Doctor contract management"),
        createBullet("Doctor revenue sharing calculation"),
        createBullet("Doctor payout processing"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.19 Human Resources", HeadingLevel.HEADING_2),
        createBullet("Employee master with personal details"),
        createBullet("Department and designation management"),
        createBullet("Employee document management"),
        createBullet("Attendance tracking"),
        createBullet("Biometric integration support"),
        createBullet("Leave request and approval workflow"),
        createBullet("Leave balance tracking"),
        createBullet("Payroll processing"),
        createBullet("Salary slip generation"),
        createBullet("Employee reports"),

        new Paragraph({ children: [new PageBreak()] }),

        createHeading("2.20 Shift & Duty Roster Management", HeadingLevel.HEADING_2),
        createBullet("Shift template definition"),
        createBullet("Duty roster creation"),
        createBullet("Shift assignment"),
        createBullet("Shift swap request and approval"),
        createBullet("Auto roster generation"),
        createBullet("Overtime tracking"),
        createBullet("Roster reports"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.21 Inventory & Supply Chain", HeadingLevel.HEADING_2),
        createBullet("Item master with categories"),
        createBullet("Vendor/supplier management"),
        createBullet("Purchase requisition"),
        createBullet("Purchase order creation and approval"),
        createBullet("Goods receipt note (GRN)"),
        createBullet("Stock management by location"),
        createBullet("Stock transfer between departments"),
        createBullet("Stock adjustment and write-off"),
        createBullet("Reorder alerts"),
        createBullet("Inventory valuation reports"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.22 CSSD (Central Sterile Supply Department)", HeadingLevel.HEADING_2),
        createBullet("Instrument master"),
        createBullet("Sterilization cycle management"),
        createBullet("Pack creation and management"),
        createBullet("Instrument tracking with barcode"),
        createBullet("Sterilization logs"),
        createBullet("Usage tracking"),
        createBullet("Maintenance scheduling"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.23 Medical Records Department (MRD)", HeadingLevel.HEADING_2),
        createBullet("ICD-10 and CPT coding"),
        createBullet("Medical record archival"),
        createBullet("Record retrieval and tracking"),
        createBullet("Record access logging"),
        createBullet("Record release request management"),
        createBullet("Statistics and reporting"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.24 Support Services", HeadingLevel.HEADING_2),
        createParagraph("Housekeeping", { bold: true }),
        createBullet("Task assignment and scheduling", 1),
        createBullet("Task completion tracking", 1),
        createBullet("Room cleaning status", 1),

        createParagraph("Diet & Kitchen", { bold: true }),
        createBullet("Diet order management", 1),
        createBullet("Meal planning", 1),
        createBullet("Kitchen production tracking", 1),
        createBullet("Delivery tracking", 1),

        createParagraph("Ambulance Services", { bold: true }),
        createBullet("Vehicle fleet management", 1),
        createBullet("Driver assignment", 1),
        createBullet("Trip scheduling and tracking", 1),
        createBullet("Trip billing", 1),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("2.25 System Administration", HeadingLevel.HEADING_2),
        createBullet("User management"),
        createBullet("Role and permission management"),
        createBullet("Multi-tenant configuration"),
        createBullet("Branch and department setup"),
        createBullet("System settings and preferences"),
        createBullet("Audit log viewing"),
        createBullet("Email and SMS configuration"),
        createBullet("Backup management"),

        // Page break
        new Paragraph({ children: [new PageBreak()] }),

        // ============ 3. TECHNOLOGY STACK ============
        createHeading("3. Technology Stack", HeadingLevel.HEADING_1),
        new Paragraph({ spacing: { before: 200 } }),
        createParagraph(
          "The Hospital ERP system is built on a modern, scalable technology stack carefully chosen for performance, security, and developer productivity."
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("3.1 Frontend Technologies", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Technology", "Version", "Purpose"],
          [
            ["React", "18.2.0", "Core UI framework with Concurrent Features"],
            ["Vite", "5.0.8", "Build tool with fast HMR and optimized bundling"],
            ["TypeScript", "5.3.3", "Static typing for improved code quality"],
            ["Ant Design", "5.12.2", "Enterprise UI component library"],
            ["Tailwind CSS", "4.1.17", "Utility-first CSS framework"],
            ["React Router", "6.20.1", "Client-side routing"],
            ["Axios", "1.6.2", "HTTP client for API requests"],
            ["Recharts", "3.5.1", "Data visualization and charts"],
            ["Zod", "3.22.4", "Runtime type validation"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("3.2 Backend Technologies", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Technology", "Version", "Purpose"],
          [
            ["Node.js", "18+", "JavaScript runtime environment"],
            ["Express", "4.18.2", "Web application framework"],
            ["TypeScript", "5.3.3", "Type-safe server development"],
            ["Prisma", "5.7.1", "Next-generation ORM for database operations"],
            ["PostgreSQL", "15+", "Primary relational database (via NeonDB)"],
            ["Redis", "Optional", "Caching layer for performance optimization"],
            ["JSON Web Token", "9.0.2", "Authentication and authorization"],
            ["bcryptjs", "2.4.3", "Password hashing"],
            ["Winston", "3.19.0", "Logging framework"],
            ["WebSocket (ws)", "8.18.3", "Real-time bidirectional communication"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("3.3 Security Stack", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Technology", "Version", "Purpose"],
          [
            ["Helmet", "8.1.0", "HTTP security headers (CSP, HSTS, etc.)"],
            ["express-rate-limit", "8.2.1", "API rate limiting"],
            ["CORS", "2.8.5", "Cross-origin resource sharing"],
            ["AES-256-GCM", "Native", "HIPAA-compliant PHI encryption"],
            ["PBKDF2", "Native", "Key derivation for encryption"],
          ]
        ),

        new Paragraph({ children: [new PageBreak()] }),

        createHeading("3.4 Integration & Services", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Service", "Technology", "Purpose"],
          [
            ["Payment Gateway", "Razorpay", "Online payment processing"],
            ["Email Service", "Nodemailer", "Transactional emails (SMTP)"],
            ["SMS Service", "Configurable", "Twilio/msg91/AWS SNS ready"],
            ["File Storage", "Multer + Local/S3", "Document and image storage"],
            ["PDF Generation", "pdfkit", "Invoice and report generation"],
            ["Excel Export", "xlsx", "Data export functionality"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("3.5 DevOps & Deployment", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Tool", "Purpose"],
          [
            ["Docker", "Containerization for consistent deployments"],
            ["Docker Compose", "Local development orchestration"],
            ["Vercel", "Serverless deployment platform"],
            ["NeonDB", "Serverless PostgreSQL hosting"],
            ["GitHub Actions", "CI/CD pipeline (recommended)"],
            ["Sentry", "Error tracking and monitoring"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("3.6 Technology Architecture Decisions", HeadingLevel.HEADING_2),
        createBullet("React 18 with Concurrent Features for improved UI responsiveness"),
        createBullet("TypeScript on both frontend and backend for type safety"),
        createBullet("Prisma ORM for type-safe database queries and migrations"),
        createBullet("NeonDB for serverless PostgreSQL with automatic scaling"),
        createBullet("JWT-based stateless authentication for horizontal scaling"),
        createBullet("WebSocket for real-time updates (bed status, notifications)"),
        createBullet("Modular route architecture for maintainability"),

        // Page break
        new Paragraph({ children: [new PageBreak()] }),

        // ============ 4. DATA FLOW DIAGRAM ============
        createHeading("4. Data Flow Diagram", HeadingLevel.HEADING_1),
        new Paragraph({ spacing: { before: 200 } }),
        createParagraph(
          "The following diagrams illustrate the data flow architecture of the Hospital ERP system, showing how information moves between different components and users."
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("4.1 High-Level System Data Flow", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 200 } }),

        // System Dataflow Image
        new Paragraph({
          children: [
            new ImageRun({
              data: systemDataflowImage,
              transformation: {
                width: 600,
                height: 467,
              },
              type: "png",
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),

        new Paragraph({ spacing: { before: 200 } }),
        createParagraph(
          "The diagram above illustrates the three-tier architecture with users accessing the React frontend, which communicates with the Express API server through secure HTTPS connections. The API server handles authentication, authorization, and business logic before interacting with the data layer."
        ),

        new Paragraph({ children: [new PageBreak()] }),

        createHeading("4.2 Patient Journey Data Flow", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 200 } }),

        // Patient Journey Image
        new Paragraph({
          children: [
            new ImageRun({
              data: patientJourneyImage,
              transformation: {
                width: 600,
                height: 400,
              },
              type: "png",
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),

        new Paragraph({ spacing: { before: 200 } }),
        createParagraph(
          "This diagram depicts the complete patient journey from registration through discharge, showing how data flows between departments and culminates in financial settlement."
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("4.3 Clinical Data Flow Summary", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 200 } }),

        createTable(
          ["Stage", "Data Input", "Processing", "Output"],
          [
            ["Registration", "Patient demographics", "Duplicate check, MRN generation", "Patient record"],
            ["Consultation", "Chief complaint, vitals", "SOAP note creation", "Encounter record"],
            ["Orders", "Lab/Radiology/Pharmacy", "Order routing to departments", "Order records"],
            ["Results", "Test results, images", "Critical value alerts", "Result records"],
            ["Prescription", "Medications, dosages", "Drug interaction check", "Prescription record"],
            ["Billing", "Services rendered", "Tariff application, insurance", "Invoice"],
            ["Discharge", "Summary, instructions", "Final settlement", "Discharge summary"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("4.4 Multi-Tenant Data Isolation", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 200 } }),
        createParagraph(
          "The system implements strict data isolation between tenants (hospital groups) and branches. Every database query is automatically filtered by tenantId, ensuring that users can only access data belonging to their organization."
        ),

        createBullet("Tenant: Top-level organization (hospital group/chain)"),
        createBullet("Branch: Individual hospital locations within a tenant"),
        createBullet("Department: Clinical departments within each branch"),
        createBullet("User: Staff members with role-based permissions"),

        // Page break
        new Paragraph({ children: [new PageBreak()] }),

        // ============ 5. SOFTWARE ARCHITECTURE ============
        createHeading("5. Software Architecture", HeadingLevel.HEADING_1),
        new Paragraph({ spacing: { before: 200 } }),
        createParagraph(
          "The Hospital ERP follows a modern three-tier architecture with clear separation of concerns between presentation, business logic, and data layers."
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("5.1 Architecture Overview", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 200 } }),

        // Architecture Image
        new Paragraph({
          children: [
            new ImageRun({
              data: architectureImage,
              transformation: {
                width: 600,
                height: 500,
              },
              type: "png",
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),

        new Paragraph({ spacing: { before: 200 } }),
        createParagraph(
          "The architecture diagram shows the layered approach with the Presentation Layer (React SPA), Business Layer (Express API with middleware and services), and Data Layer (PostgreSQL, Redis, File Storage)."
        ),

        new Paragraph({ children: [new PageBreak()] }),

        createHeading("5.2 Component Architecture", HeadingLevel.HEADING_2),

        createTable(
          ["Layer", "Component", "Responsibility"],
          [
            ["Presentation", "React Pages", "UI rendering, user interaction, form handling"],
            ["Presentation", "Contexts", "Global state (Auth, WebSocket, Notifications)"],
            ["Presentation", "Services", "API communication, response transformation"],
            ["Business", "Routes", "HTTP endpoint definitions, request routing"],
            ["Business", "Middleware", "Auth, validation, rate limiting, logging"],
            ["Business", "Services", "Business logic, calculations, integrations"],
            ["Business", "Validators", "Input validation schemas (Zod)"],
            ["Data", "Prisma Client", "Database queries, transactions"],
            ["Data", "Redis Client", "Session caching, rate limit counters"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("5.3 Security Architecture", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 200 } }),

        createTable(
          ["Layer", "Security Measure", "Implementation"],
          [
            ["Network", "HTTPS/TLS", "Enforced via Vercel/Nginx"],
            ["Network", "Rate Limiting", "100 req/15min general, 5 req/15min auth"],
            ["Application", "JWT Authentication", "24h access, 7d refresh tokens"],
            ["Application", "RBAC", "20 roles, 142 permissions"],
            ["Application", "CSRF Protection", "Double-submit cookie pattern"],
            ["Application", "Input Validation", "Zod schemas on all endpoints"],
            ["Application", "Security Headers", "Helmet.js (CSP, HSTS, X-Frame)"],
            ["Data", "Password Hashing", "bcrypt with 12 rounds"],
            ["Data", "PHI Encryption", "AES-256-GCM with PBKDF2"],
            ["Data", "Audit Logging", "All sensitive operations logged"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("5.4 Module Architecture", HeadingLevel.HEADING_2),
        createParagraph(
          "The backend is organized into 20+ route modules, each handling a specific domain. This modular approach allows for:"
        ),
        createBullet("Independent development and testing of modules"),
        createBullet("Easy feature toggling per tenant"),
        createBullet("Clear code organization and maintainability"),
        createBullet("Potential for microservices migration in future"),

        new Paragraph({ spacing: { before: 200 } }),
        createParagraph("Backend Module Structure:", { bold: true }),
        createBullet("src/routes/pharmacy.ts - Pharmacy operations", 1),
        createBullet("src/routes/insurance.ts - Insurance management", 1),
        createBullet("src/routes/opd-workflow.ts - OPD clinical flow", 1),
        createBullet("src/routes/billing.ts - Billing operations", 1),
        createBullet("src/routes/beds.ts - Bed management", 1),
        createBullet("src/routes/radiology.ts - Radiology workflow", 1),
        createBullet("src/routes/nursingCarePlan.ts - Nursing care", 1),
        createBullet("src/routes/shifts.ts - Shift management", 1),
        createBullet("src/routes/mrd.ts - Medical records", 1),
        createBullet("src/routes/cssd.ts - Sterilization", 1),

        // Page break
        new Paragraph({ children: [new PageBreak()] }),

        // ============ 6. PLAN OF ACTION ============
        createHeading("6. Plan of Action (Phase-wise Development)", HeadingLevel.HEADING_1),
        new Paragraph({ spacing: { before: 200 } }),
        createParagraph(
          "The development is structured into distinct phases to ensure systematic delivery and allow for iterative feedback."
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("6.1 Phase 1: Foundation & Core Infrastructure", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Deliverable", "Description"],
          [
            ["Project Setup", "Repository, TypeScript, ESLint, Prettier configuration"],
            ["Database Design", "Prisma schema with 65+ models"],
            ["Authentication", "JWT-based auth with refresh tokens"],
            ["Authorization", "RBAC with 20 roles, 142 permissions"],
            ["Security Layer", "Helmet, rate limiting, CORS, CSRF"],
            ["API Framework", "Express with modular routing"],
            ["Frontend Shell", "React + Vite + Ant Design setup"],
            ["Multi-tenancy", "Tenant/Branch data isolation"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("6.2 Phase 2: Patient & Clinical Modules", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Deliverable", "Description"],
          [
            ["Patient Registration", "Demographics, MRN, duplicate detection"],
            ["Appointment System", "Scheduling, availability, reminders"],
            ["OPD Module", "SOAP notes, prescriptions, referrals"],
            ["IPD Module", "Admission, bed assignment, daily notes"],
            ["Emergency Module", "Triage, MLC, priority workflow"],
            ["ICU Module", "Critical care, continuous monitoring"],
            ["Nursing Module", "Care plans, medication administration"],
            ["Bed Management", "Real-time availability, transfers"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("6.3 Phase 3: Diagnostics & Pharmacy", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Deliverable", "Description"],
          [
            ["Laboratory", "Test orders, sample tracking, results"],
            ["Radiology", "Study management, image annotation, reports"],
            ["Blood Bank", "Donors, inventory, cross-matching"],
            ["Pharmacy", "Stock management, dispensing, POS"],
            ["CSSD", "Sterilization tracking, instruments"],
          ]
        ),

        new Paragraph({ children: [new PageBreak()] }),

        createHeading("6.4 Phase 4: Surgery & Specialty", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Deliverable", "Description"],
          [
            ["Operation Theatre", "Scheduling, room management, reports"],
            ["Anesthesia", "Pre-op, intra-op, post-op documentation"],
            ["Surgery Records", "Implants, complications, consent"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("6.5 Phase 5: Financial & Billing", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Deliverable", "Description"],
          [
            ["Billing System", "Invoicing, packages, discounts"],
            ["Payment Gateway", "Razorpay integration"],
            ["Insurance Module", "Eligibility, pre-auth, claims"],
            ["Accounting", "Chart of accounts, journal entries"],
            ["Commission System", "Referral commissions, payouts"],
            ["Doctor Revenue", "Contracts, revenue sharing"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("6.6 Phase 6: HR & Operations", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Deliverable", "Description"],
          [
            ["HR Module", "Employee management, attendance, leave"],
            ["Shift Management", "Rosters, swaps, biometric"],
            ["Inventory", "Stock, purchase orders, transfers"],
            ["Housekeeping", "Task assignment and tracking"],
            ["Diet/Kitchen", "Meal planning and delivery"],
            ["Ambulance", "Vehicle and trip management"],
            ["MRD", "Medical records coding and archival"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("6.7 Phase 7: Production Hardening", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Deliverable", "Description"],
          [
            ["Frontend RBAC", "Page-level access control enforcement"],
            ["API Refactoring", "Modularize server.ts"],
            ["Error Handling", "Comprehensive error wrapper implementation"],
            ["Email/SMS Config", "Provider integration (Twilio/msg91)"],
            ["Testing Suite", "Unit and integration test coverage"],
            ["Monitoring", "Sentry integration, metrics dashboard"],
            ["Documentation", "API docs, runbooks, ADRs"],
          ]
        ),

        new Paragraph({ children: [new PageBreak()] }),

        createHeading("6.8 Phase 8: Deployment & Go-Live", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Deliverable", "Description"],
          [
            ["Staging Deployment", "Deploy to staging environment"],
            ["UAT", "User acceptance testing"],
            ["Security Audit", "Penetration testing, vulnerability scan"],
            ["Performance Testing", "Load testing, optimization"],
            ["Production Deploy", "Deploy to production"],
            ["Training", "User and admin training sessions"],
            ["Go-Live Support", "On-call support during launch"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("6.9 Future Enhancements (Phase 9+)", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Deliverable", "Description", "Priority"],
          [
            ["Mobile App", "React Native patient/staff apps", "High"],
            ["Video Consultation", "Telemedicine integration", "Medium"],
            ["BI Dashboard", "Advanced analytics and reporting", "Medium"],
            ["PACS Integration", "Full DICOM viewer, HL7/FHIR", "Medium"],
            ["Patient Portal", "Self-service patient features", "Medium"],
            ["AI Features", "Predictive analytics, NLP summaries", "Low"],
          ]
        ),

        // Page break
        new Paragraph({ children: [new PageBreak()] }),

        // ============ 7. REQUIRED TEAM SETUP ============
        createHeading("7. Required Team Setup", HeadingLevel.HEADING_1),
        new Paragraph({ spacing: { before: 200 } }),
        createParagraph(
          "The following team structure is recommended for successful development, deployment, and maintenance of the Hospital ERP system."
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("7.1 Core Development Team", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Role", "Count", "Responsibilities", "Skills Required"],
          [
            ["Tech Lead / Architect", "1", "Architecture, code review, technical decisions", "10+ yrs, React, Node.js, PostgreSQL"],
            ["Senior Backend Developer", "2", "API development, database, integrations", "5+ yrs, Node.js, Express, Prisma"],
            ["Senior Frontend Developer", "2", "UI/UX implementation, state management", "5+ yrs, React, TypeScript, Ant Design"],
            ["Full Stack Developer", "2", "Feature development across stack", "3+ yrs, React, Node.js"],
            ["QA Engineer", "2", "Manual and automated testing", "3+ yrs, Selenium, Jest, Cypress"],
            ["DevOps Engineer", "1", "CI/CD, infrastructure, monitoring", "3+ yrs, Docker, AWS/Vercel, GitHub Actions"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("7.2 Specialized Roles", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Role", "Count", "Responsibilities", "Engagement"],
          [
            ["Healthcare Domain Expert", "1", "Workflow validation, compliance", "Part-time / Consultant"],
            ["Security Specialist", "1", "Security audit, HIPAA compliance", "Part-time / Consultant"],
            ["UI/UX Designer", "1", "Design system, user research", "Part-time / As needed"],
            ["Database Administrator", "1", "Performance tuning, backups", "Part-time / As needed"],
            ["Technical Writer", "1", "Documentation, API specs", "Part-time"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("7.3 Project Management", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Role", "Count", "Responsibilities"],
          [
            ["Project Manager", "1", "Sprint planning, stakeholder communication, timeline"],
            ["Scrum Master", "1", "Agile ceremonies, impediment removal (can be combined with PM)"],
            ["Product Owner", "1", "Requirements, backlog prioritization, acceptance"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("7.4 Team Summary", HeadingLevel.HEADING_2),
        createBullet("Total Core Team: 10 full-time members"),
        createBullet("Specialized/Part-time: 5 members"),
        createBullet("Management: 2-3 members"),
        createBullet("Total Team Size: 15-18 members"),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("7.5 Team Scaling Recommendations", HeadingLevel.HEADING_2),
        createParagraph("Phase 1-3 (Foundation): 8-10 team members", { bold: true }),
        createBullet("Focus on core infrastructure and clinical modules"),

        createParagraph("Phase 4-6 (Features): 12-15 team members", { bold: true }),
        createBullet("Parallel development of specialty and financial modules"),

        createParagraph("Phase 7-8 (Hardening & Deployment): 10-12 team members", { bold: true }),
        createBullet("Focus on quality, testing, and maintenance"),

        // Page break
        new Paragraph({ children: [new PageBreak()] }),

        // ============ 8. PROJECT TIMELINE ============
        createHeading("8. Project Timeline", HeadingLevel.HEADING_1),
        new Paragraph({ spacing: { before: 200 } }),
        createParagraph(
          "The following timeline represents the development schedule for the Hospital ERP system. Actual duration may vary based on team size and scope changes."
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("8.1 Development Timeline Overview", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Phase", "Duration", "Milestones", "Deliverables"],
          [
            ["Phase 1: Foundation", "6-8 weeks", "Architecture complete, Auth working", "Core infrastructure"],
            ["Phase 2: Clinical", "8-10 weeks", "Patient flow complete", "OPD, IPD, Emergency, ICU"],
            ["Phase 3: Diagnostics", "6-8 weeks", "Lab & Radiology live", "Lab, Radiology, Pharmacy"],
            ["Phase 4: Surgery", "4-6 weeks", "OT module complete", "Surgery, Anesthesia"],
            ["Phase 5: Financial", "6-8 weeks", "Billing integrated", "Billing, Insurance, Accounting"],
            ["Phase 6: Operations", "6-8 weeks", "All modules complete", "HR, Inventory, Support"],
            ["Phase 7: Hardening", "4-6 weeks", "Production ready", "Testing, Security, Docs"],
            ["Phase 8: Deployment", "2-4 weeks", "System live", "Go-live, Training"],
          ]
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createParagraph("Total Estimated Duration: 42-58 weeks (10-14 months)", { bold: true }),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("8.2 Project Timeline Gantt Chart", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 200 } }),

        // Timeline Gantt Chart Image
        new Paragraph({
          children: [
            new ImageRun({
              data: timelineImage,
              transformation: {
                width: 600,
                height: 316,
              },
              type: "png",
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),

        new Paragraph({ spacing: { before: 200 } }),
        createParagraph(
          "The Gantt chart above visualizes the phase-wise development timeline. Some phases (5 & 6) can run in parallel with sufficient team capacity."
        ),

        new Paragraph({ children: [new PageBreak()] }),

        createHeading("8.3 Key Milestones", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Milestone", "Target", "Success Criteria"],
          [
            ["M1: Technical Foundation", "Week 8", "Auth, DB, basic UI working"],
            ["M2: Clinical MVP", "Week 18", "Patient registration to discharge"],
            ["M3: Diagnostics Complete", "Week 26", "Lab & Radiology integrated"],
            ["M4: Full Feature Set", "Week 42", "All modules functional"],
            ["M5: Production Ready", "Week 48", "Security audit passed, docs complete"],
            ["M6: Go-Live", "Week 52", "System deployed, users trained"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("8.4 Risk Mitigation & Buffer", HeadingLevel.HEADING_2),
        createBullet("10-15% buffer added to each phase for unforeseen issues"),
        createBullet("Weekly sprint reviews for early issue detection"),
        createBullet("Phased deployment to minimize go-live risk"),
        createBullet("Parallel workstreams where dependencies allow"),

        // Page break
        new Paragraph({ children: [new PageBreak()] }),

        // ============ 9. API DOCUMENTATION ============
        createHeading("9. API Documentation", HeadingLevel.HEADING_1),
        new Paragraph({ spacing: { before: 200 } }),
        createParagraph(
          "The Hospital ERP exposes a comprehensive RESTful API with 150+ endpoints. All endpoints require JWT authentication unless otherwise noted. Full interactive API documentation is available at /api/docs via Swagger UI."
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("9.1 API Overview", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Property", "Value"],
          [
            ["Base URL", "https://{hostname}/api"],
            ["Protocol", "HTTPS (TLS 1.2+)"],
            ["Authentication", "Bearer Token (JWT)"],
            ["Content Type", "application/json"],
            ["Rate Limit", "100 requests / 15 minutes"],
            ["Auth Rate Limit", "5 requests / 15 minutes"],
            ["Documentation", "/api/docs (Swagger UI)"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("9.2 Authentication Endpoints", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Method", "Endpoint", "Description", "Auth"],
          [
            ["POST", "/api/auth/login", "Authenticate user, returns JWT tokens", "No"],
            ["POST", "/api/auth/refresh", "Refresh access token", "Refresh Token"],
            ["POST", "/api/auth/logout", "Invalidate session", "Yes"],
            ["POST", "/api/auth/forgot-password", "Request password reset email", "No"],
            ["POST", "/api/auth/reset-password", "Complete password reset", "No"],
            ["POST", "/api/auth/change-password", "Change password (logged in)", "Yes"],
            ["GET", "/api/auth/validate", "Validate current token", "Yes"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("9.3 Patient Management Endpoints", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Method", "Endpoint", "Description"],
          [
            ["GET", "/api/patients", "List patients with filters and pagination"],
            ["POST", "/api/patients", "Create new patient (auto MRN generation)"],
            ["GET", "/api/patients/:id", "Get patient details with history"],
            ["PATCH", "/api/patients/:id", "Update patient demographics"],
            ["POST", "/api/patients/check-duplicates", "Check for duplicate patients"],
            ["POST", "/api/patients/merge", "Merge duplicate patient records"],
            ["GET", "/api/patients/:id/encounters", "List patient encounters"],
            ["GET", "/api/patients/:id/documents", "List patient documents"],
            ["GET", "/api/export/patients", "Export patients to Excel"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("9.4 Appointment Endpoints", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Method", "Endpoint", "Description"],
          [
            ["GET", "/api/appointments", "List appointments with filters"],
            ["POST", "/api/appointments", "Schedule new appointment"],
            ["GET", "/api/appointments/:id", "Get appointment details"],
            ["PATCH", "/api/appointments/:id", "Update appointment"],
            ["DELETE", "/api/appointments/:id", "Cancel appointment"],
            ["POST", "/api/appointments/:id/reschedule", "Reschedule appointment"],
            ["POST", "/api/appointments/:id/check-in", "Mark patient checked in"],
            ["GET", "/api/doctors/:id/availability", "Get doctor availability slots"],
          ]
        ),

        new Paragraph({ children: [new PageBreak()] }),

        createHeading("9.5 Clinical Workflow Endpoints", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createParagraph("OPD (Outpatient)", { bold: true }),
        createTable(
          ["Method", "Endpoint", "Description"],
          [
            ["POST", "/api/encounters", "Create new encounter"],
            ["GET", "/api/encounters/:id", "Get encounter details"],
            ["POST", "/api/opd-notes", "Create OPD consultation note"],
            ["POST", "/api/vitals", "Record patient vital signs"],
            ["POST", "/api/prescriptions", "Create prescription"],
          ]
        ),

        new Paragraph({ spacing: { before: 200 } }),
        createParagraph("IPD (Inpatient)", { bold: true }),
        createTable(
          ["Method", "Endpoint", "Description"],
          [
            ["POST", "/api/admissions", "Admit patient to ward"],
            ["GET", "/api/admissions/:id", "Get admission details"],
            ["PATCH", "/api/admissions/:id", "Update admission"],
            ["POST", "/api/admissions/:id/discharge", "Discharge patient"],
            ["GET", "/api/ipd/charges/:admissionId", "Get IPD charges"],
            ["POST", "/api/ipd/charges", "Add IPD service charge"],
          ]
        ),

        new Paragraph({ spacing: { before: 200 } }),
        createParagraph("Emergency", { bold: true }),
        createTable(
          ["Method", "Endpoint", "Description"],
          [
            ["GET", "/api/emergency-cases", "List emergency cases"],
            ["POST", "/api/emergency-cases", "Register emergency case"],
            ["PATCH", "/api/emergency-cases/:id", "Update case (triage, status)"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("9.6 Laboratory Endpoints", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Method", "Endpoint", "Description"],
          [
            ["GET", "/api/lab/orders", "List lab orders"],
            ["POST", "/api/lab/orders", "Create lab order"],
            ["GET", "/api/lab/orders/:id", "Get order details"],
            ["PATCH", "/api/lab/orders/:id/sample", "Collect sample"],
            ["POST", "/api/lab/results", "Enter test results"],
            ["GET", "/api/lab/reports/:id", "Get lab report PDF"],
            ["GET", "/api/lab/tests", "List available tests"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("9.7 Billing & Payment Endpoints", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Method", "Endpoint", "Description"],
          [
            ["GET", "/api/invoices", "List invoices"],
            ["POST", "/api/invoices", "Create invoice"],
            ["GET", "/api/invoices/:id", "Get invoice details"],
            ["POST", "/api/invoices/:id/payment", "Record payment"],
            ["POST", "/api/payments/create-order", "Create Razorpay order"],
            ["POST", "/api/payments/verify", "Verify payment"],
            ["POST", "/api/refunds", "Process refund"],
            ["GET", "/api/ipd-billing/:admissionId", "Get IPD billing summary"],
          ]
        ),

        new Paragraph({ children: [new PageBreak()] }),

        createHeading("9.8 Insurance Endpoints", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Method", "Endpoint", "Description"],
          [
            ["POST", "/api/insurance/verify-eligibility", "Verify patient insurance"],
            ["GET", "/api/insurance/coverage/:id", "Get coverage details"],
            ["POST", "/api/insurance/coverage/:id/check-limit", "Check coverage limit"],
            ["POST", "/api/tpa/pre-authorizations", "Submit pre-auth request"],
            ["GET", "/api/claims", "List insurance claims"],
            ["POST", "/api/claims", "Submit new claim"],
            ["GET", "/api/claims/:id", "Get claim status"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("9.9 Pharmacy Endpoints", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Method", "Endpoint", "Description"],
          [
            ["GET", "/api/pharmacy/stock", "List pharmacy stock"],
            ["POST", "/api/pharmacy/stock", "Add stock entry"],
            ["GET", "/api/pharmacy/dispense", "List dispense records"],
            ["POST", "/api/pharmacy/dispense", "Dispense medication"],
            ["GET", "/api/pharmacy/sales", "List pharmacy sales"],
            ["POST", "/api/pharmacy/sales", "Create sale transaction"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("9.10 HR & Administrative Endpoints", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Method", "Endpoint", "Description"],
          [
            ["GET", "/api/employees", "List employees"],
            ["POST", "/api/employees", "Create employee"],
            ["GET", "/api/employees/:id", "Get employee details"],
            ["GET", "/api/attendance", "List attendance records"],
            ["POST", "/api/attendance/punch", "Record punch in/out"],
            ["GET", "/api/leave-requests", "List leave requests"],
            ["POST", "/api/leave-requests", "Submit leave request"],
            ["GET", "/api/shifts", "List shift assignments"],
            ["POST", "/api/shifts/swap-request", "Request shift swap"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("9.11 System & Health Endpoints", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Method", "Endpoint", "Description", "Auth"],
          [
            ["GET", "/health", "Basic health check", "No"],
            ["GET", "/api/health", "Detailed health with DB status", "No"],
            ["GET", "/api/health/detailed", "Full system metrics", "Admin"],
            ["GET", "/api/ready", "Kubernetes readiness probe", "No"],
            ["GET", "/api/live", "Kubernetes liveness probe", "No"],
            ["GET", "/api/audit-logs", "Query audit logs", "Admin"],
          ]
        ),

        // Page break
        new Paragraph({ children: [new PageBreak()] }),

        // ============ 10. DATABASE SCHEMA ============
        createHeading("10. Database Schema", HeadingLevel.HEADING_1),
        new Paragraph({ spacing: { before: 200 } }),
        createParagraph(
          "The database schema consists of 65+ entities designed to support all hospital operations. The schema uses PostgreSQL with Prisma ORM and includes proper indexing, foreign keys, and audit fields."
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createHeading("10.1 Schema Statistics", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Metric", "Value"],
          [
            ["Total Tables/Models", "65+"],
            ["Schema Lines (Prisma)", "2800+"],
            ["Primary Database", "PostgreSQL 15"],
            ["ORM", "Prisma 5.7"],
            ["Connection Pooling", "NeonDB Serverless Adapter"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("10.2 Core Entity Groups", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createParagraph("Multi-Tenancy Entities", { bold: true }),
        createTable(
          ["Entity", "Purpose", "Key Fields"],
          [
            ["Tenant", "Hospital group/organization", "id, name, code, settings, isActive"],
            ["Branch", "Hospital location", "id, tenantId, name, address, code"],
            ["Department", "Clinical department", "id, branchId, name, type, isActive"],
            ["Module", "Feature module definition", "id, name, code, description"],
            ["BranchModule", "Module activation per branch", "branchId, moduleId, isActive"],
          ]
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createParagraph("User & Access Control", { bold: true }),
        createTable(
          ["Entity", "Purpose", "Key Fields"],
          [
            ["User", "System user account", "id, email, username, passwordHash, roleIds"],
            ["Role", "User role definition", "id, name, permissions[]"],
            ["AuditLog", "Operation audit trail", "id, userId, action, entity, details"],
          ]
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createParagraph("Patient Entities", { bold: true }),
        createTable(
          ["Entity", "Purpose", "Key Fields"],
          [
            ["Patient", "Patient master", "id, mrn, firstName, lastName, dob, gender, phone"],
            ["PatientInsurance", "Insurance info", "patientId, tpaId, policyNumber, coverage"],
            ["Document", "Patient documents", "patientId, type, filePath, uploadedAt"],
          ]
        ),

        new Paragraph({ children: [new PageBreak()] }),

        createParagraph("Clinical Entities", { bold: true }),
        createTable(
          ["Entity", "Purpose", "Key Fields"],
          [
            ["Encounter", "Clinical visit record", "id, patientId, type (OPD/IPD/ER), status"],
            ["Appointment", "Scheduled visit", "id, patientId, doctorId, dateTime, status"],
            ["OPDNote", "Outpatient notes", "encounterId, chiefComplaint, diagnosis, plan"],
            ["Admission", "IPD admission", "id, patientId, bedId, admitDate, dischargeDate"],
            ["Prescription", "Medication orders", "id, encounterId, drugs[], instructions"],
            ["Order", "Service orders", "id, encounterId, type (Lab/Radiology), status"],
            ["Result", "Test results", "id, orderId, values, normalRanges, status"],
          ]
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createParagraph("Nursing Entities", { bold: true }),
        createTable(
          ["Entity", "Purpose", "Key Fields"],
          [
            ["NursingCarePlan", "Care plan", "id, admissionId, status, diagnoses[]"],
            ["NursingVitals", "Vital recordings", "admissionId, temperature, BP, pulse, SpO2"],
            ["MedicationAdmin", "Drug administration", "prescriptionItemId, administeredAt, nurse"],
            ["HandoverNote", "Shift handover", "admissionId, fromNurse, toNurse, notes"],
          ]
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createParagraph("Bed Management", { bold: true }),
        createTable(
          ["Entity", "Purpose", "Key Fields"],
          [
            ["Ward", "Ward configuration", "id, branchId, name, type, capacity"],
            ["Bed", "Bed information", "id, wardId, bedNumber, status, type"],
            ["BedReservation", "Bed booking", "bedId, patientId, from, to, status"],
            ["BedTransfer", "Patient transfer", "patientId, fromBedId, toBedId, transferAt"],
          ]
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createParagraph("Surgery & Anesthesia", { bold: true }),
        createTable(
          ["Entity", "Purpose", "Key Fields"],
          [
            ["Surgery", "Surgery record", "id, patientId, procedureId, theatreId, status"],
            ["OTTheatre", "Operating theatre", "id, branchId, name, type, equipment"],
            ["AnesthesiaRecord", "Anesthesia details", "surgeryId, type, drugs[], monitoring"],
            ["SurgeryImplant", "Implants used", "surgeryId, implantName, serialNumber"],
          ]
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createParagraph("Diagnostics", { bold: true }),
        createTable(
          ["Entity", "Purpose", "Key Fields"],
          [
            ["LabTestMaster", "Test catalog", "id, name, code, normalRange, price"],
            ["RadiologyStudy", "Imaging study", "id, patientId, modality, status"],
            ["RadiologyImage", "DICOM images", "studyId, seriesId, imagePath"],
            ["BloodInventory", "Blood units", "id, bloodGroup, expiryDate, status"],
          ]
        ),

        new Paragraph({ children: [new PageBreak()] }),

        createParagraph("Pharmacy & Inventory", { bold: true }),
        createTable(
          ["Entity", "Purpose", "Key Fields"],
          [
            ["Drug", "Drug master", "id, name, genericName, form, strength"],
            ["PharmacyStock", "Stock levels", "drugId, batchNo, qty, expiryDate"],
            ["PharmacySale", "Sales transaction", "id, patientId, items[], total"],
            ["InventoryItem", "Inventory master", "id, name, category, reorderLevel"],
            ["PurchaseOrder", "Purchase order", "id, vendorId, items[], status"],
          ]
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createParagraph("Billing & Finance", { bold: true }),
        createTable(
          ["Entity", "Purpose", "Key Fields"],
          [
            ["Invoice", "Bill/Invoice", "id, patientId, items[], total, status"],
            ["Payment", "Payment record", "invoiceId, amount, method, transactionId"],
            ["Service", "Service master", "id, name, category, basePrice"],
            ["Tariff", "Pricing rules", "serviceId, patientType, price"],
            ["IPDCharge", "IPD charges", "admissionId, serviceId, qty, amount"],
          ]
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createParagraph("Insurance", { bold: true }),
        createTable(
          ["Entity", "Purpose", "Key Fields"],
          [
            ["TPAMaster", "TPA providers", "id, name, contactInfo, network"],
            ["PreAuthorization", "Pre-auth requests", "patientId, tpaId, amount, status"],
            ["Claim", "Insurance claims", "invoiceId, tpaId, claimAmount, status"],
            ["InsuranceEligibility", "Eligibility check", "patientId, verified, coverage"],
          ]
        ),

        new Paragraph({ spacing: { before: 300 } }),
        createParagraph("HR & Operations", { bold: true }),
        createTable(
          ["Entity", "Purpose", "Key Fields"],
          [
            ["Employee", "Staff records", "id, userId, department, designation, joinDate"],
            ["EmployeeAttendance", "Attendance", "employeeId, date, punchIn, punchOut"],
            ["LeaveRequest", "Leave applications", "employeeId, type, from, to, status"],
            ["ShiftTemplate", "Shift definitions", "id, name, startTime, endTime"],
            ["Shift", "Shift assignments", "employeeId, templateId, date"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("10.3 Entity Relationship Highlights", HeadingLevel.HEADING_2),
        createBullet("Tenant → Branch → Department (hierarchical multi-tenancy)"),
        createBullet("Patient → Encounter → Orders/Results (clinical workflow)"),
        createBullet("Admission → Bed → Ward (bed management)"),
        createBullet("Surgery → AnesthesiaRecord → Implants (surgical workflow)"),
        createBullet("Invoice → Payments → Refunds (financial flow)"),
        createBullet("Employee → Attendance → Leave → Payroll (HR flow)"),

        // Page break
        new Paragraph({ children: [new PageBreak()] }),

        // ============ 11. APPENDICES ============
        createHeading("11. Appendices", HeadingLevel.HEADING_1),
        new Paragraph({ spacing: { before: 200 } }),

        createHeading("11.1 Glossary of Terms", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Term", "Definition"],
          [
            ["MRN", "Medical Record Number - unique patient identifier"],
            ["OPD", "Outpatient Department - walk-in consultations"],
            ["IPD", "Inpatient Department - admitted patients"],
            ["ICU", "Intensive Care Unit - critical care"],
            ["OT", "Operation Theatre - surgical procedures"],
            ["MLC", "Medico-Legal Case - cases with legal implications"],
            ["TPA", "Third Party Administrator - insurance processor"],
            ["HIPAA", "Health Insurance Portability and Accountability Act"],
            ["RBAC", "Role-Based Access Control"],
            ["JWT", "JSON Web Token - authentication mechanism"],
            ["SOAP", "Subjective, Objective, Assessment, Plan (clinical note format)"],
            ["NANDA", "Nursing diagnosis classification system"],
            ["CSSD", "Central Sterile Supply Department"],
            ["MRD", "Medical Records Department"],
            ["PACS", "Picture Archiving and Communication System"],
            ["DICOM", "Digital Imaging and Communications in Medicine"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("11.2 User Roles Reference", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Role", "Access Level", "Primary Functions"],
          [
            ["ADMIN", "Full System", "All features, user management, settings"],
            ["DOCTOR", "Clinical", "Patient care, orders, prescriptions, notes"],
            ["NURSE", "Nursing", "Vitals, medication admin, care plans"],
            ["FRONT_OFFICE", "Registration", "Patient registration, appointments"],
            ["BILLING", "Financial", "Invoicing, payments, claims"],
            ["LAB_TECH", "Laboratory", "Sample processing, results entry"],
            ["RADIOLOGY_TECH", "Radiology", "Studies, image management"],
            ["PHARMACIST", "Pharmacy", "Dispensing, stock management"],
            ["HR", "Administrative", "Employee, attendance, payroll"],
            ["INVENTORY", "Supply Chain", "Stock, purchase orders"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("11.3 Environment Variables", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),

        createTable(
          ["Variable", "Purpose", "Example"],
          [
            ["DATABASE_URL", "PostgreSQL connection string", "postgresql://user:pass@host/db"],
            ["JWT_SECRET", "JWT signing secret", "your-secret-key"],
            ["JWT_EXPIRES_IN", "Access token expiry", "24h"],
            ["REFRESH_TOKEN_EXPIRES_IN", "Refresh token expiry", "7d"],
            ["CORS_ORIGIN", "Allowed CORS origins", "https://app.example.com"],
            ["REDIS_URL", "Redis connection (optional)", "redis://localhost:6379"],
            ["RAZORPAY_KEY_ID", "Razorpay API key", "rzp_test_xxxx"],
            ["RAZORPAY_KEY_SECRET", "Razorpay secret", "secret_xxxx"],
            ["SMTP_HOST", "Email SMTP server", "smtp.gmail.com"],
            ["SMTP_USER", "SMTP username", "noreply@example.com"],
            ["SENTRY_DSN", "Sentry error tracking", "https://xxx@sentry.io/xxx"],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        createHeading("11.4 Contact Information", HeadingLevel.HEADING_2),
        new Paragraph({ spacing: { before: 150 } }),
        createParagraph("For questions or clarifications regarding this Statement of Work, please contact:"),
        createBullet("Project Lead: [Name]"),
        createBullet("Email: [email@company.com]"),
        createBullet("Phone: [+XX-XXXX-XXXXXX]"),

        new Paragraph({ spacing: { before: 600 } }),
        new Paragraph({
          children: [
            new TextRun({
              text: "— End of Document —",
              size: 24,
              italics: true,
              color: COLORS.darkGray,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    },
  ],
});

// Generate the document
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("Hospital_ERP_Statement_of_Work.docx", buffer);
  console.log("✅ Statement of Work document generated successfully!");
  console.log("📄 File: Hospital_ERP_Statement_of_Work.docx");
  console.log("\n📊 Embedded Images:");
  console.log("   - diagram_system_dataflow.png (Section 4.1)");
  console.log("   - diagram_patient_journey.png (Section 4.2)");
  console.log("   - diagram_architecture.png (Section 5.1)");
  console.log("   - diagram_timeline.png (Section 8.2)");
});
