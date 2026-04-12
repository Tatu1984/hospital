const { createCanvas } = require("canvas");
const fs = require("fs");

// Color scheme
const COLORS = {
  primary: "#1E3A5F",
  secondary: "#2980B9",
  accent: "#27AE60",
  lightBlue: "#E8F4FD",
  lightGreen: "#E8F8F0",
  lightOrange: "#FEF5E7",
  lightPurple: "#F4ECF7",
  white: "#FFFFFF",
  darkGray: "#333333",
  lightGray: "#F5F5F5",
  border: "#BDC3C7",
};

// Helper function to draw rounded rectangle
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

// Helper to draw arrow
function drawArrow(ctx, fromX, fromY, toX, toY, color = COLORS.darkGray) {
  const headLength = 10;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Arrow head
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

// ============ DIAGRAM 1: High-Level System Data Flow (4.1) ============
function generateSystemDataFlow() {
  const canvas = createCanvas(900, 700);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, 0, 900, 700);

  // Title
  ctx.fillStyle = COLORS.primary;
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("High-Level System Data Flow", 450, 35);

  // Main container
  ctx.strokeStyle = COLORS.primary;
  ctx.lineWidth = 3;
  roundRect(ctx, 30, 55, 840, 620, 15, false, true);

  // Title inside container
  ctx.fillStyle = COLORS.primary;
  ctx.font = "bold 18px Arial";
  ctx.fillText("HOSPITAL ERP SYSTEM", 450, 85);

  // User boxes at top
  const users = [
    { label: "Doctor", icon: "👨‍⚕️", x: 100 },
    { label: "Nurse", icon: "👩‍⚕️", x: 280 },
    { label: "Admin", icon: "👤", x: 460 },
    { label: "Patient", icon: "🏥", x: 640 },
  ];

  users.forEach((user) => {
    ctx.fillStyle = COLORS.lightBlue;
    ctx.strokeStyle = COLORS.secondary;
    ctx.lineWidth = 2;
    roundRect(ctx, user.x, 110, 120, 60, 8, true, true);

    ctx.fillStyle = COLORS.darkGray;
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(user.label, user.x + 60, 148);
  });

  // Connection lines from users
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(160, 170);
  ctx.lineTo(160, 200);
  ctx.lineTo(450, 200);
  ctx.moveTo(340, 170);
  ctx.lineTo(340, 200);
  ctx.moveTo(520, 170);
  ctx.lineTo(520, 200);
  ctx.moveTo(700, 170);
  ctx.lineTo(700, 200);
  ctx.lineTo(450, 200);
  ctx.lineTo(450, 220);
  ctx.stroke();
  ctx.setLineDash([]);

  // React SPA Box
  ctx.fillStyle = COLORS.lightGreen;
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 2;
  roundRect(ctx, 300, 230, 300, 80, 10, true, true);

  ctx.fillStyle = COLORS.darkGray;
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("React SPA", 450, 258);
  ctx.font = "13px Arial";
  ctx.fillText("(Frontend - Vite + TypeScript)", 450, 278);
  ctx.fillText("Ant Design UI Components", 450, 295);

  // Arrow down
  drawArrow(ctx, 450, 310, 450, 350, COLORS.secondary);
  ctx.fillStyle = COLORS.secondary;
  ctx.font = "12px Arial";
  ctx.fillText("HTTPS / WebSocket", 520, 335);

  // Express API Box
  ctx.fillStyle = COLORS.lightOrange;
  ctx.strokeStyle = "#E67E22";
  ctx.lineWidth = 2;
  roundRect(ctx, 250, 360, 400, 100, 10, true, true);

  ctx.fillStyle = COLORS.darkGray;
  ctx.font = "bold 16px Arial";
  ctx.fillText("Express API Server", 450, 390);
  ctx.font = "13px Arial";
  ctx.fillText("(Backend - Node.js + TypeScript)", 450, 410);

  // Security badges
  const badges = ["JWT Auth", "Rate Limiting", "RBAC", "Validation"];
  badges.forEach((badge, i) => {
    ctx.fillStyle = COLORS.primary;
    ctx.font = "11px Arial";
    const badgeX = 280 + i * 100;
    ctx.fillStyle = COLORS.lightBlue;
    roundRect(ctx, badgeX, 425, 85, 22, 5, true, false);
    ctx.fillStyle = COLORS.primary;
    ctx.fillText(badge, badgeX + 42, 440);
  });

  // Arrows to databases
  drawArrow(ctx, 350, 460, 180, 520, COLORS.secondary);
  drawArrow(ctx, 450, 460, 450, 520, COLORS.secondary);
  drawArrow(ctx, 550, 460, 720, 520, COLORS.secondary);

  // Database boxes
  // PostgreSQL
  ctx.fillStyle = COLORS.lightPurple;
  ctx.strokeStyle = "#8E44AD";
  ctx.lineWidth = 2;
  roundRect(ctx, 80, 530, 200, 100, 10, true, true);
  ctx.fillStyle = COLORS.darkGray;
  ctx.font = "bold 14px Arial";
  ctx.fillText("PostgreSQL", 180, 560);
  ctx.font = "12px Arial";
  ctx.fillText("(NeonDB Serverless)", 180, 580);
  ctx.fillText("65+ Tables", 180, 600);
  ctx.fillText("Primary Data Store", 180, 618);

  // Redis
  ctx.fillStyle = "#FDEDEC";
  ctx.strokeStyle = "#E74C3C";
  roundRect(ctx, 350, 530, 200, 100, 10, true, true);
  ctx.fillStyle = COLORS.darkGray;
  ctx.font = "bold 14px Arial";
  ctx.fillText("Redis Cache", 450, 560);
  ctx.font = "12px Arial";
  ctx.fillText("(Optional)", 450, 580);
  ctx.fillText("Session & Rate Limit", 450, 600);
  ctx.fillText("Insurance Eligibility Cache", 450, 618);

  // External Services
  ctx.fillStyle = "#E8F6F3";
  ctx.strokeStyle = "#1ABC9C";
  roundRect(ctx, 620, 530, 200, 100, 10, true, true);
  ctx.fillStyle = COLORS.darkGray;
  ctx.font = "bold 14px Arial";
  ctx.fillText("External Services", 720, 560);
  ctx.font = "12px Arial";
  ctx.fillText("Razorpay (Payments)", 720, 580);
  ctx.fillText("Email / SMS", 720, 600);
  ctx.fillText("File Storage", 720, 618);

  // Save
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync("diagram_system_dataflow.png", buffer);
  console.log("✅ Generated: diagram_system_dataflow.png");
}

// ============ DIAGRAM 2: Patient Journey Data Flow (4.2) ============
function generatePatientJourney() {
  const canvas = createCanvas(900, 600);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, 0, 900, 600);

  // Title
  ctx.fillStyle = COLORS.primary;
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Patient Journey Data Flow", 450, 35);

  // Flow boxes - Row 1
  const row1 = [
    { label: "Patient\nRegistration", x: 50, color: "#E8F4FD" },
    { label: "Appointment\nScheduling", x: 220, color: "#E8F4FD" },
    { label: "Check-in", x: 390, color: "#E8F8F0" },
    { label: "Consultation\n(OPD/IPD)", x: 560, color: "#FEF5E7" },
    { label: "Clinical\nWorkflow", x: 730, color: "#FEF5E7" },
  ];

  row1.forEach((box, i) => {
    ctx.fillStyle = box.color;
    ctx.strokeStyle = COLORS.secondary;
    ctx.lineWidth = 2;
    roundRect(ctx, box.x, 70, 140, 70, 8, true, true);

    ctx.fillStyle = COLORS.darkGray;
    ctx.font = "bold 13px Arial";
    const lines = box.label.split("\n");
    lines.forEach((line, j) => {
      ctx.fillText(line, box.x + 70, 100 + j * 18);
    });

    // Arrow to next
    if (i < row1.length - 1) {
      drawArrow(ctx, box.x + 140, 105, box.x + 170, 105, COLORS.accent);
    }
  });

  // Sub-items under row 1
  const subItems1 = [
    { label: "MRN Generation", x: 70, y: 155 },
    { label: "Demographics", x: 70, y: 175 },
    { label: "Doctor Selection", x: 240, y: 155 },
    { label: "Time Slot", x: 240, y: 175 },
    { label: "Queue Mgmt", x: 410, y: 155 },
    { label: "Vitals", x: 410, y: 175 },
    { label: "SOAP Notes", x: 580, y: 155 },
    { label: "Diagnosis", x: 580, y: 175 },
    { label: "Lab Orders", x: 750, y: 155 },
    { label: "Prescriptions", x: 750, y: 175 },
  ];

  ctx.font = "11px Arial";
  ctx.fillStyle = "#666";
  subItems1.forEach((item) => {
    ctx.fillText("• " + item.label, item.x, item.y);
  });

  // Arrow down to row 2
  drawArrow(ctx, 800, 140, 800, 220, COLORS.primary);

  // Row 2 - Clinical Departments
  ctx.fillStyle = COLORS.lightPurple;
  ctx.strokeStyle = "#8E44AD";
  ctx.lineWidth = 2;
  roundRect(ctx, 50, 230, 800, 80, 10, true, true);

  ctx.fillStyle = COLORS.darkGray;
  ctx.font = "bold 16px Arial";
  ctx.fillText("Clinical Departments", 450, 255);

  const depts = ["Laboratory", "Radiology", "Pharmacy", "Blood Bank", "ICU", "OT"];
  ctx.font = "12px Arial";
  depts.forEach((dept, i) => {
    const x = 100 + i * 125;
    ctx.fillStyle = COLORS.white;
    roundRect(ctx, x, 270, 100, 28, 5, true, false);
    ctx.fillStyle = "#8E44AD";
    ctx.fillText(dept, x + 50, 288);
  });

  // Arrow down
  drawArrow(ctx, 450, 310, 450, 350, COLORS.primary);

  // Row 3 - Results & Documentation
  const row3 = [
    { label: "Test Results\n& Reports", x: 120, color: "#E8F8F0" },
    { label: "Clinical\nDocumentation", x: 320, color: "#E8F8F0" },
    { label: "Nursing\nCare", x: 520, color: "#FEF5E7" },
    { label: "Discharge\nPlanning", x: 720, color: "#FDEDEC" },
  ];

  row3.forEach((box, i) => {
    ctx.fillStyle = box.color;
    ctx.strokeStyle = COLORS.secondary;
    ctx.lineWidth = 2;
    roundRect(ctx, box.x, 360, 140, 60, 8, true, true);

    ctx.fillStyle = COLORS.darkGray;
    ctx.font = "bold 12px Arial";
    const lines = box.label.split("\n");
    lines.forEach((line, j) => {
      ctx.fillText(line, box.x + 70, 385 + j * 15);
    });

    if (i < row3.length - 1) {
      drawArrow(ctx, box.x + 140, 390, box.x + 180, 390, COLORS.accent);
    }
  });

  // Arrow down to Billing
  drawArrow(ctx, 450, 420, 450, 460, COLORS.primary);

  // Row 4 - Financial
  ctx.fillStyle = "#FEF9E7";
  ctx.strokeStyle = "#F39C12";
  ctx.lineWidth = 3;
  roundRect(ctx, 150, 470, 600, 100, 10, true, true);

  ctx.fillStyle = COLORS.darkGray;
  ctx.font = "bold 16px Arial";
  ctx.fillText("Financial Settlement", 450, 495);

  const finItems = [
    { label: "Billing", x: 200 },
    { label: "Insurance\nClaims", x: 340 },
    { label: "Payment\nCollection", x: 480 },
    { label: "Discharge\nSummary", x: 620 },
  ];

  finItems.forEach((item, i) => {
    ctx.fillStyle = COLORS.white;
    roundRect(ctx, item.x, 510, 100, 45, 5, true, false);
    ctx.fillStyle = "#F39C12";
    ctx.font = "11px Arial";
    const lines = item.label.split("\n");
    lines.forEach((line, j) => {
      ctx.fillText(line, item.x + 50, 530 + j * 13);
    });

    if (i < finItems.length - 1) {
      drawArrow(ctx, item.x + 100, 532, item.x + 140, 532, "#F39C12");
    }
  });

  // Save
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync("diagram_patient_journey.png", buffer);
  console.log("✅ Generated: diagram_patient_journey.png");
}

// ============ DIAGRAM 3: Software Architecture (5.1) ============
function generateArchitecture() {
  const canvas = createCanvas(900, 750);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, 0, 900, 750);

  // Title
  ctx.fillStyle = COLORS.primary;
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Software Architecture Overview", 450, 35);

  // Layer 1: Presentation Layer
  ctx.fillStyle = "#E8F4FD";
  ctx.strokeStyle = COLORS.secondary;
  ctx.lineWidth = 3;
  roundRect(ctx, 50, 60, 800, 180, 12, true, true);

  ctx.fillStyle = COLORS.secondary;
  ctx.font = "bold 18px Arial";
  ctx.fillText("PRESENTATION LAYER", 450, 90);

  // React box
  ctx.fillStyle = COLORS.white;
  ctx.strokeStyle = COLORS.secondary;
  ctx.lineWidth = 2;
  roundRect(ctx, 100, 110, 700, 110, 8, true, true);

  ctx.fillStyle = COLORS.darkGray;
  ctx.font = "bold 16px Arial";
  ctx.fillText("React SPA (Vite + TypeScript + Ant Design)", 450, 135);

  // Components inside
  const presentationItems = [
    { label: "65 Page\nComponents", x: 130 },
    { label: "Context-based\nState Mgmt", x: 270 },
    { label: "Protected\nRoutes", x: 410 },
    { label: "WebSocket\nIntegration", x: 550 },
    { label: "Form\nValidation", x: 690 },
  ];

  presentationItems.forEach((item) => {
    ctx.fillStyle = COLORS.lightBlue;
    roundRect(ctx, item.x, 150, 110, 55, 5, true, false);
    ctx.fillStyle = COLORS.darkGray;
    ctx.font = "11px Arial";
    const lines = item.label.split("\n");
    lines.forEach((line, j) => {
      ctx.fillText(line, item.x + 55, 172 + j * 14);
    });
  });

  // Arrow down
  drawArrow(ctx, 450, 240, 450, 270, COLORS.primary);
  ctx.fillStyle = COLORS.primary;
  ctx.font = "bold 12px Arial";
  ctx.fillText("HTTPS / WebSocket", 540, 260);

  // Layer 2: Business Layer
  ctx.fillStyle = "#FEF5E7";
  ctx.strokeStyle = "#E67E22";
  ctx.lineWidth = 3;
  roundRect(ctx, 50, 280, 800, 220, 12, true, true);

  ctx.fillStyle = "#E67E22";
  ctx.font = "bold 18px Arial";
  ctx.fillText("BUSINESS LAYER", 450, 310);

  // Business components - Row 1
  const businessRow1 = [
    { label: "Express\nRouter", desc: "20+ modules", x: 80, color: "#FADBD8" },
    { label: "Services", desc: "20+ modules", x: 230, color: "#D5F5E3" },
    { label: "Middleware", desc: "10 types", x: 380, color: "#FCF3CF" },
    { label: "Validators", desc: "Zod schemas", x: 530, color: "#D6EAF8" },
    { label: "RBAC", desc: "20 roles", x: 680, color: "#F5EEF8" },
  ];

  businessRow1.forEach((item) => {
    ctx.fillStyle = item.color;
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    roundRect(ctx, item.x, 330, 130, 70, 6, true, true);
    ctx.fillStyle = COLORS.darkGray;
    ctx.font = "bold 12px Arial";
    const lines = item.label.split("\n");
    lines.forEach((line, j) => {
      ctx.fillText(line, item.x + 65, 355 + j * 14);
    });
    ctx.font = "10px Arial";
    ctx.fillStyle = "#666";
    ctx.fillText(item.desc, item.x + 65, 390);
  });

  // Business components - Row 2
  const businessRow2 = [
    { label: "JWT Auth", x: 130 },
    { label: "Rate Limiting", x: 280 },
    { label: "Error Handling", x: 430 },
    { label: "Audit Logging", x: 580 },
    { label: "PDF/Excel Gen", x: 730 },
  ];

  businessRow2.forEach((item) => {
    ctx.fillStyle = COLORS.white;
    ctx.strokeStyle = "#E67E22";
    roundRect(ctx, item.x, 420, 120, 35, 5, true, true);
    ctx.fillStyle = COLORS.darkGray;
    ctx.font = "11px Arial";
    ctx.fillText(item.label, item.x + 60, 442);
  });

  // Security badges
  ctx.fillStyle = "#E67E22";
  ctx.font = "bold 11px Arial";
  ctx.fillText("Security: Helmet | CORS | CSRF | Input Sanitization | HIPAA Encryption", 450, 480);

  // Arrow down
  drawArrow(ctx, 450, 500, 450, 530, COLORS.primary);
  ctx.fillStyle = COLORS.primary;
  ctx.font = "bold 12px Arial";
  ctx.fillText("Prisma ORM", 520, 520);

  // Layer 3: Data Layer
  ctx.fillStyle = "#F4ECF7";
  ctx.strokeStyle = "#8E44AD";
  ctx.lineWidth = 3;
  roundRect(ctx, 50, 540, 800, 180, 12, true, true);

  ctx.fillStyle = "#8E44AD";
  ctx.font = "bold 18px Arial";
  ctx.fillText("DATA LAYER", 450, 570);

  // Data components
  const dataItems = [
    {
      label: "PostgreSQL",
      desc: "65+ tables\nPrimary data store\nNeonDB Serverless",
      x: 100,
      color: "#D6EAF8",
    },
    {
      label: "Redis",
      desc: "Session cache\nRate limit counters\n(Optional)",
      x: 350,
      color: "#FADBD8",
    },
    {
      label: "File Storage",
      desc: "Document uploads\nImages & PDFs\nLocal/S3",
      x: 600,
      color: "#D5F5E3",
    },
  ];

  dataItems.forEach((item) => {
    ctx.fillStyle = item.color;
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    roundRect(ctx, item.x, 590, 200, 110, 8, true, true);

    ctx.fillStyle = COLORS.darkGray;
    ctx.font = "bold 14px Arial";
    ctx.fillText(item.label, item.x + 100, 615);

    ctx.font = "11px Arial";
    ctx.fillStyle = "#666";
    const lines = item.desc.split("\n");
    lines.forEach((line, j) => {
      ctx.fillText(line, item.x + 100, 638 + j * 15);
    });
  });

  // Save
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync("diagram_architecture.png", buffer);
  console.log("✅ Generated: diagram_architecture.png");
}

// ============ DIAGRAM 4: Project Timeline Gantt Chart (8.2) ============
function generateTimeline() {
  const canvas = createCanvas(950, 500);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, 0, 950, 500);

  // Title
  ctx.fillStyle = COLORS.primary;
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Project Timeline - Gantt Chart", 475, 35);

  // Month headers
  const months = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"];
  const startX = 200;
  const monthWidth = 58;

  ctx.fillStyle = COLORS.primary;
  ctx.font = "bold 12px Arial";
  months.forEach((month, i) => {
    ctx.fillText(month, startX + i * monthWidth + monthWidth / 2, 70);
  });

  // Grid lines
  ctx.strokeStyle = "#E0E0E0";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(startX + i * monthWidth, 80);
    ctx.lineTo(startX + i * monthWidth, 440);
    ctx.stroke();
  }

  // Phases
  const phases = [
    { name: "Phase 1: Foundation", start: 0, duration: 2, color: "#3498DB", status: "Complete" },
    { name: "Phase 2: Clinical Modules", start: 2, duration: 2.5, color: "#2ECC71", status: "Complete" },
    { name: "Phase 3: Diagnostics", start: 4.5, duration: 2, color: "#9B59B6", status: "Complete" },
    { name: "Phase 4: Surgery & Specialty", start: 6.5, duration: 1.5, color: "#E74C3C", status: "Complete" },
    { name: "Phase 5: Financial Modules", start: 8, duration: 2, color: "#F39C12", status: "Complete" },
    { name: "Phase 6: HR & Operations", start: 8, duration: 2, color: "#1ABC9C", status: "Complete" },
    { name: "Phase 7: Production Hardening", start: 10, duration: 1.5, color: "#34495E", status: "In Progress" },
    { name: "Phase 8: Deployment & Training", start: 11.5, duration: 0.5, color: "#E91E63", status: "Planned" },
  ];

  const barHeight = 35;
  const barGap = 10;
  let yPos = 95;

  phases.forEach((phase) => {
    // Phase label
    ctx.fillStyle = COLORS.darkGray;
    ctx.font = "12px Arial";
    ctx.textAlign = "right";
    ctx.fillText(phase.name, startX - 10, yPos + barHeight / 2 + 4);

    // Bar
    ctx.fillStyle = phase.color;
    const barX = startX + phase.start * monthWidth;
    const barWidth = phase.duration * monthWidth;
    roundRect(ctx, barX, yPos, barWidth, barHeight, 5, true, false);

    // Status badge
    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(phase.status, barX + barWidth / 2, yPos + barHeight / 2 + 4);

    yPos += barHeight + barGap;
  });

  // Legend
  ctx.textAlign = "left";
  yPos = 450;
  ctx.fillStyle = COLORS.darkGray;
  ctx.font = "bold 12px Arial";
  ctx.fillText("Legend:", 50, yPos);

  const legendItems = [
    { label: "Complete", color: "#2ECC71" },
    { label: "In Progress", color: "#F39C12" },
    { label: "Planned", color: "#95A5A6" },
  ];

  let legendX = 120;
  legendItems.forEach((item) => {
    ctx.fillStyle = item.color;
    roundRect(ctx, legendX, yPos - 12, 15, 15, 3, true, false);
    ctx.fillStyle = COLORS.darkGray;
    ctx.font = "11px Arial";
    ctx.fillText(item.label, legendX + 22, yPos);
    legendX += 100;
  });

  // Total duration note
  ctx.fillStyle = COLORS.primary;
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Total Estimated Duration: 10-14 Months", 600, 470);

  // Save
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync("diagram_timeline.png", buffer);
  console.log("✅ Generated: diagram_timeline.png");
}

// Generate all diagrams
generateSystemDataFlow();
generatePatientJourney();
generateArchitecture();
generateTimeline();

console.log("\n✅ All diagrams generated successfully!");
