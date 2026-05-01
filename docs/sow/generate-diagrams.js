/* eslint-disable */
const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const COLORS = {
  primary: "#1E3A5F",
  secondary: "#2980B9",
  accent: "#27AE60",
  warn: "#E67E22",
  danger: "#C0392B",
  lightBlue: "#E8F4FD",
  lightGreen: "#E8F8F0",
  lightOrange: "#FEF5E7",
  lightPurple: "#F4ECF7",
  lightGray: "#F5F7FA",
  white: "#FFFFFF",
  dark: "#1F2937",
  gray: "#6B7280",
  border: "#94A3B8",
};

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function box(ctx, x, y, w, h, label, sub, fill, border) {
  ctx.fillStyle = fill || COLORS.lightBlue;
  ctx.strokeStyle = border || COLORS.primary;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 10, true, true);
  ctx.fillStyle = COLORS.dark;
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + 26);
  if (sub) {
    ctx.font = "12px Arial";
    ctx.fillStyle = COLORS.gray;
    const lines = Array.isArray(sub) ? sub : [sub];
    lines.forEach((ln, i) => {
      ctx.fillText(ln, x + w / 2, y + 48 + i * 16);
    });
  }
}

function arrow(ctx, x1, y1, x2, y2, color, label) {
  ctx.strokeStyle = color || COLORS.dark;
  ctx.fillStyle = color || COLORS.dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const head = 9;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(ang - Math.PI / 6), y2 - head * Math.sin(ang - Math.PI / 6));
  ctx.lineTo(x2 - head * Math.cos(ang + Math.PI / 6), y2 - head * Math.sin(ang + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  if (label) {
    ctx.fillStyle = COLORS.dark;
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 6);
  }
}

function header(ctx, w, title, subtitle) {
  ctx.fillStyle = COLORS.primary;
  ctx.fillRect(0, 0, w, 70);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";
  ctx.fillText(title, w / 2, 32);
  ctx.font = "13px Arial";
  ctx.fillText(subtitle, w / 2, 54);
}

// ------------ ARCHITECTURE DIAGRAM ------------
function generateArchitecture() {
  const W = 1600,
    H = 1100;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, 0, W, H);
  header(ctx, W, "Hospital ERP — Software Architecture", "Multi-tier, multi-tenant HMS on Express + Prisma + PostgreSQL");

  // Client tier
  ctx.fillStyle = COLORS.lightPurple;
  roundRect(ctx, 40, 100, W - 80, 110, 12, true, false);
  ctx.fillStyle = COLORS.dark;
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "left";
  ctx.fillText("CLIENT TIER", 56, 122);
  box(ctx, 80, 138, 240, 60, "Web Browser (React SPA)", "Vite · shadcn/ui · Ant Design", COLORS.white, COLORS.secondary);
  box(ctx, 360, 138, 240, 60, "Mobile (PWA)", "Responsive · OPD/IPD apps", COLORS.white, COLORS.secondary);
  box(ctx, 640, 138, 240, 60, "Biometric Devices", "Attendance · IoT push", COLORS.white, COLORS.secondary);
  box(ctx, 920, 138, 240, 60, "DICOM Modalities", "Lab/Radiology equipment", COLORS.white, COLORS.secondary);
  box(ctx, 1200, 138, 360, 60, "External Integrations", "Tally · TPA · SMS/Email · Razorpay", COLORS.white, COLORS.secondary);

  // Edge tier
  ctx.fillStyle = COLORS.lightOrange;
  roundRect(ctx, 40, 240, W - 80, 110, 12, true, false);
  ctx.fillStyle = COLORS.dark;
  ctx.font = "bold 14px Arial";
  ctx.fillText("EDGE / GATEWAY TIER", 56, 262);
  box(ctx, 200, 278, 280, 60, "Nginx Reverse Proxy", "TLS · gzip · static caching", COLORS.white, COLORS.warn);
  box(ctx, 540, 278, 280, 60, "Cloudflare / CDN", "WAF · DDoS · geo cache", COLORS.white, COLORS.warn);
  box(ctx, 880, 278, 280, 60, "Rate Limiter", "express-rate-limit · per-route", COLORS.white, COLORS.warn);
  box(ctx, 1220, 278, 280, 60, "Helmet + CORS", "Security headers · origin allowlist", COLORS.white, COLORS.warn);

  // Application tier
  ctx.fillStyle = COLORS.lightBlue;
  roundRect(ctx, 40, 380, W - 80, 290, 12, true, false);
  ctx.fillStyle = COLORS.dark;
  ctx.font = "bold 14px Arial";
  ctx.fillText("APPLICATION TIER — Node.js / Express / TypeScript", 56, 402);

  box(ctx, 80, 420, 220, 64, "Auth & RBAC", ["JWT · bcrypt · 19 roles", "100+ permissions"], COLORS.white, COLORS.primary);
  box(ctx, 320, 420, 220, 64, "Patient & OPD", ["Encounters · Notes", "Appointments · Vitals"], COLORS.white, COLORS.primary);
  box(ctx, 560, 420, 220, 64, "IPD / ICU / ER", ["Admissions · Beds", "Vitals · Ventilator"], COLORS.white, COLORS.primary);
  box(ctx, 800, 420, 220, 64, "OT & Surgery", ["Schedules · Rooms", "Start/Complete flows"], COLORS.white, COLORS.primary);
  box(ctx, 1040, 420, 220, 64, "Lab / Radiology", ["Orders · Results", "Phlebotomy · DICOM"], COLORS.white, COLORS.primary);
  box(ctx, 1280, 420, 280, 64, "Pharmacy / Blood Bank", ["Drugs · Stock · Donors", "Cross-match · Issuance"], COLORS.white, COLORS.primary);

  box(ctx, 80, 504, 220, 64, "Billing & TPA", ["Invoices · IPD bill", "Pre-auth · Claims"], COLORS.white, COLORS.primary);
  box(ctx, 320, 504, 220, 64, "Accounting", ["Ledger · Journal", "Tally sync"], COLORS.white, COLORS.primary);
  box(ctx, 560, 504, 220, 64, "HR & Payroll", ["Employees · Leave", "Salary structures"], COLORS.white, COLORS.primary);
  box(ctx, 800, 504, 220, 64, "Inventory & PO", ["Items · Stock · GRN", "Suppliers"], COLORS.white, COLORS.primary);
  box(ctx, 1040, 504, 220, 64, "Ambulance · Diet", ["Trips · Vehicles", "Meal orders"], COLORS.white, COLORS.primary);
  box(ctx, 1280, 504, 280, 64, "Quality · CSSD · Housekeeping", ["Incidents · Sterilization", "Tasks · Laundry"], COLORS.white, COLORS.primary);

  box(ctx, 80, 588, 320, 64, "Cross-cutting Middleware", ["Helmet · CORS · CSRF · Rate-limit", "Zod validation · audit · HIPAA"], COLORS.white, COLORS.danger);
  box(ctx, 420, 588, 320, 64, "Observability", ["Winston logger · audit logs", "/health · /ready · /live · Sentry"], COLORS.white, COLORS.danger);
  box(ctx, 760, 588, 320, 64, "Background Jobs", ["Notifications · Reports", "Tally sync · Payroll batch"], COLORS.white, COLORS.danger);
  box(ctx, 1100, 588, 460, 64, "Swagger / OpenAPI", ["/api/docs · /api/docs.json"], COLORS.white, COLORS.danger);

  // Data tier
  ctx.fillStyle = COLORS.lightGreen;
  roundRect(ctx, 40, 700, W - 80, 240, 12, true, false);
  ctx.fillStyle = COLORS.dark;
  ctx.font = "bold 14px Arial";
  ctx.fillText("DATA TIER", 56, 722);

  box(ctx, 80, 740, 320, 80, "PostgreSQL 15", ["67 tables · multi-tenant", "tenantId / branchId scoping"], COLORS.white, COLORS.accent);
  box(ctx, 420, 740, 280, 80, "Prisma ORM", ["Type-safe client", "7 migrations"], COLORS.white, COLORS.accent);
  box(ctx, 720, 740, 280, 80, "Redis", ["Sessions · cache", "Rate-limit store"], COLORS.white, COLORS.accent);
  box(ctx, 1020, 740, 280, 80, "Object Storage", ["DICOM/PACS images", "Reports · attachments"], COLORS.white, COLORS.accent);
  box(ctx, 1320, 740, 240, 80, "Backup", ["pg_dump · WAL", "S3 · 30-day"], COLORS.white, COLORS.accent);

  box(ctx, 80, 840, 460, 80, "Audit Log Store", ["Append-only · PHI access trail", "HIPAA retention · 7 years"], COLORS.white, COLORS.accent);
  box(ctx, 560, 840, 460, 80, "Read Replicas (optional)", ["Reporting · MIS", "BI tools · Analytics"], COLORS.white, COLORS.accent);
  box(ctx, 1040, 840, 520, 80, "Encryption", ["TLS 1.3 in transit · AES-256 at rest", "PHI columns: row-level encryption"], COLORS.white, COLORS.accent);

  // Infra
  ctx.fillStyle = COLORS.lightGray;
  roundRect(ctx, 40, 970, W - 80, 110, 12, true, false);
  ctx.fillStyle = COLORS.dark;
  ctx.font = "bold 14px Arial";
  ctx.fillText("INFRASTRUCTURE", 56, 992);
  box(ctx, 80, 1008, 240, 60, "Docker Compose", "Backend · FE · Postgres · Redis", COLORS.white, COLORS.gray);
  box(ctx, 360, 1008, 240, 60, "GitHub Actions CI", "Lint · test · build · push", COLORS.white, COLORS.gray);
  box(ctx, 640, 1008, 240, 60, "Container Registry", "Versioned images", COLORS.white, COLORS.gray);
  box(ctx, 920, 1008, 240, 60, "Kubernetes (optional)", "HA · auto-scaling", COLORS.white, COLORS.gray);
  box(ctx, 1200, 1008, 360, 60, "Monitoring", "Prometheus · Grafana · Sentry · uptime", COLORS.white, COLORS.gray);

  // Connectors
  arrow(ctx, 800, 198, 800, 240, COLORS.dark, "HTTPS");
  arrow(ctx, 800, 338, 800, 380, COLORS.dark, "Authenticated REST");
  arrow(ctx, 800, 670, 800, 700, COLORS.dark, "Prisma queries");
  arrow(ctx, 800, 920, 800, 970, COLORS.dark, "Deploy / orchestrate");

  fs.writeFileSync(
    path.join(__dirname, "diagrams", "diagram_architecture.jpg"),
    canvas.toBuffer("image/jpeg", { quality: 0.95 })
  );
  console.log("✓ diagram_architecture.jpg");
}

// ------------ DATA FLOW DIAGRAM ------------
function generateDataFlow() {
  const W = 1600,
    H = 1150;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, 0, W, H);
  header(ctx, W, "Hospital ERP — End-to-End Data Flow", "Patient journey from registration to discharge with billing & analytics");

  // Lane 1: Front Office / Registration
  box(ctx, 60, 110, 240, 80, "Patient Walks In", ["Front Office desk", "or appointment kiosk"], COLORS.lightPurple, COLORS.secondary);
  box(ctx, 360, 110, 240, 80, "Registration", ["UHID generated", "Demographics + ID proof"], COLORS.lightBlue, COLORS.primary);
  box(ctx, 660, 110, 240, 80, "Appointment / Token", ["Slot booking", "Doctor / Department"], COLORS.lightBlue, COLORS.primary);
  box(ctx, 960, 110, 240, 80, "Payment / Insurance", ["Self-pay or TPA", "Pre-auth if applicable"], COLORS.lightOrange, COLORS.warn);
  box(ctx, 1260, 110, 280, 80, "Audit Log", ["PHI access tracked", "AuditLog table append"], COLORS.lightGray, COLORS.gray);

  arrow(ctx, 300, 150, 360, 150);
  arrow(ctx, 600, 150, 660, 150);
  arrow(ctx, 900, 150, 960, 150);
  arrow(ctx, 1200, 150, 1260, 150);

  // Lane 2: Clinical
  box(ctx, 60, 230, 240, 80, "OPD Encounter", ["Vitals · history", "Doctor consultation"], COLORS.lightGreen, COLORS.accent);
  box(ctx, 360, 230, 240, 80, "Orders Placed", ["Lab · Radiology", "Pharmacy · Procedure"], COLORS.lightGreen, COLORS.accent);
  box(ctx, 660, 230, 240, 80, "Diagnostics", ["Sample / Imaging", "Phlebotomy · DICOM"], COLORS.lightGreen, COLORS.accent);
  box(ctx, 960, 230, 240, 80, "Results Reviewed", ["Validated by tech", "Doctor signs off"], COLORS.lightGreen, COLORS.accent);
  box(ctx, 1260, 230, 280, 80, "Treatment Plan", ["Prescription · advice", "Discharge or admit"], COLORS.lightGreen, COLORS.accent);

  arrow(ctx, 300, 270, 360, 270);
  arrow(ctx, 600, 270, 660, 270);
  arrow(ctx, 900, 270, 960, 270);
  arrow(ctx, 1200, 270, 1260, 270);

  arrow(ctx, 180, 190, 180, 230, COLORS.secondary, "OPD path");

  // Decision: admit?
  box(ctx, 660, 350, 240, 60, "Admit?", "Y → IPD · N → Discharge", COLORS.lightOrange, COLORS.warn);
  arrow(ctx, 1380, 310, 780, 350);

  // Lane 3a: IPD
  box(ctx, 60, 440, 240, 80, "Bed Allotment", ["Ward · Room · Bed", "Bed status updated"], COLORS.lightBlue, COLORS.primary);
  box(ctx, 360, 440, 240, 80, "Nursing Care", ["Vitals · meds", "Nurse station notes"], COLORS.lightBlue, COLORS.primary);
  box(ctx, 660, 440, 240, 80, "OT / ICU (if needed)", ["Surgery scheduled", "ICU vitals · ventilator"], COLORS.lightBlue, COLORS.primary);
  box(ctx, 960, 440, 240, 80, "Pharmacy Dispensing", ["Drug stock decrement", "Charge to admission"], COLORS.lightBlue, COLORS.primary);
  box(ctx, 1260, 440, 280, 80, "Discharge Summary", ["Final notes · meds", "Bed freed"], COLORS.lightBlue, COLORS.primary);

  arrow(ctx, 780, 410, 180, 440, COLORS.warn, "Yes → IPD");
  arrow(ctx, 300, 480, 360, 480);
  arrow(ctx, 600, 480, 660, 480);
  arrow(ctx, 900, 480, 960, 480);
  arrow(ctx, 1200, 480, 1260, 480);

  // Lane 4: Billing
  box(ctx, 60, 580, 240, 80, "Charges Aggregated", ["OPD/IPD · lab · pharma", "Procedures · OT · ICU"], COLORS.lightOrange, COLORS.warn);
  box(ctx, 360, 580, 240, 80, "Invoice Generated", ["Itemised bill", "Discount · package"], COLORS.lightOrange, COLORS.warn);
  box(ctx, 660, 580, 240, 80, "Payment", ["Cash · card · UPI", "Razorpay · receipt"], COLORS.lightOrange, COLORS.warn);
  box(ctx, 960, 580, 240, 80, "TPA / Insurance Claim", ["Claim submitted", "EOB tracked"], COLORS.lightOrange, COLORS.warn);
  box(ctx, 1260, 580, 280, 80, "Doctor Commission", ["Revenue share", "Referral payout"], COLORS.lightOrange, COLORS.warn);

  arrow(ctx, 780, 520, 180, 580, COLORS.warn, "Discharge → bill");
  arrow(ctx, 300, 620, 360, 620);
  arrow(ctx, 600, 620, 660, 620);
  arrow(ctx, 900, 620, 960, 620);
  arrow(ctx, 1200, 620, 1260, 620);

  // Lane 5: Accounting
  box(ctx, 60, 720, 240, 80, "Journal Entry", ["Auto-posted", "Account heads"], COLORS.lightGreen, COLORS.accent);
  box(ctx, 360, 720, 240, 80, "Ledger / Trial Balance", ["Real-time GL", "Fiscal year scoped"], COLORS.lightGreen, COLORS.accent);
  box(ctx, 660, 720, 240, 80, "Tally Sync", ["Push to Tally ERP", "Daily / on-demand"], COLORS.lightGreen, COLORS.accent);
  box(ctx, 960, 720, 240, 80, "Payroll", ["Salary structures", "Payslips · attendance"], COLORS.lightGreen, COLORS.accent);
  box(ctx, 1260, 720, 280, 80, "Inventory & PO", ["GRN · supplier payment", "Stock revaluation"], COLORS.lightGreen, COLORS.accent);

  arrow(ctx, 180, 660, 180, 720);
  arrow(ctx, 300, 760, 360, 760);
  arrow(ctx, 600, 760, 660, 760);
  arrow(ctx, 900, 760, 960, 760);
  arrow(ctx, 1200, 760, 1260, 760);

  // Lane 6: Reporting / Analytics
  box(ctx, 60, 860, 360, 80, "MIS / Reporting", ["Daily · weekly · monthly", "OPD · IPD · revenue · pharma"], COLORS.lightPurple, COLORS.secondary);
  box(ctx, 460, 860, 360, 80, "Operational Dashboards", ["Bed occupancy · TAT", "Doctor productivity"], COLORS.lightPurple, COLORS.secondary);
  box(ctx, 860, 860, 360, 80, "Compliance & Audit", ["HIPAA · NABH", "Data retention 7y"], COLORS.lightPurple, COLORS.secondary);
  box(ctx, 1260, 860, 280, 80, "External APIs", ["Insurance · TPA", "SMS · Email · WhatsApp"], COLORS.lightPurple, COLORS.secondary);

  arrow(ctx, 180, 800, 180, 860);

  // Audit log fan-in
  ctx.strokeStyle = COLORS.gray;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(1400, 190);
  ctx.lineTo(1400, 940);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = COLORS.gray;
  ctx.font = "italic 11px Arial";
  ctx.textAlign = "center";
  ctx.fillText("audit fan-in (every PHI access)", 1400, 985);

  // Footer legend
  ctx.fillStyle = COLORS.dark;
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Legend:", 60, 1030);
  const legends = [
    { c: COLORS.lightPurple, t: "Front-office / Reporting" },
    { c: COLORS.lightBlue, t: "Clinical (OPD/IPD)" },
    { c: COLORS.lightGreen, t: "Diagnostics / Accounting" },
    { c: COLORS.lightOrange, t: "Billing / Decision" },
    { c: COLORS.lightGray, t: "Cross-cutting (audit)" },
  ];
  let lx = 130;
  legends.forEach((lg) => {
    ctx.fillStyle = lg.c;
    roundRect(ctx, lx, 1018, 20, 16, 4, true, false);
    ctx.fillStyle = COLORS.dark;
    ctx.font = "12px Arial";
    ctx.fillText(lg.t, lx + 26, 1031);
    lx += 240;
  });

  ctx.fillStyle = COLORS.gray;
  ctx.font = "11px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    "Each step writes to AuditLog (who/what/when) and emits structured Winston logs. Errors are captured by Sentry. Health is tracked by /api/ready and /api/live.",
    W / 2,
    1095
  );

  fs.writeFileSync(
    path.join(__dirname, "diagrams", "diagram_dataflow.jpg"),
    canvas.toBuffer("image/jpeg", { quality: 0.95 })
  );
  console.log("✓ diagram_dataflow.jpg");
}

generateArchitecture();
generateDataFlow();
console.log("Done.");
