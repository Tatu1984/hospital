-- CreateTable
CREATE TABLE "appointment_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "speciality" TEXT,
    "preferredTime" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_requests_tenantId_status_createdAt_idx" ON "appointment_requests"("tenantId", "status", "createdAt");
