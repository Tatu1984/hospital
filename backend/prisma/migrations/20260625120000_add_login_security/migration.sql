-- Login security / IP tracking (ported from HRMS, multi-tenant).
-- Purely additive: new enum types + 4 new tables. No existing table is altered.

-- CreateEnum
CREATE TYPE "AuthEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'SESSION_EXPIRED', 'SESSION_REVOKED');

-- CreateEnum
CREATE TYPE "LocationConsentStatus" AS ENUM ('PENDING', 'GRANTED', 'DENIED');

-- CreateTable
CREATE TABLE "auth_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" "AuthEventType" NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "userRole" TEXT,
    "sessionId" TEXT,
    "usernameTried" TEXT,
    "failureReason" TEXT,
    "ipAddress" TEXT,
    "city" TEXT,
    "district" TEXT,
    "region" TEXT,
    "postal" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geoSource" TEXT,
    "isp" TEXT,
    "asn" TEXT,
    "org" TEXT,
    "isVpnOrProxy" BOOLEAN,
    "ipTimezone" TEXT,
    "userAgent" TEXT,
    "browserName" TEXT,
    "osName" TEXT,
    "deviceType" TEXT,
    "deviceFingerprint" TEXT,
    "clientTimezone" TEXT,
    "gpsLatitude" DOUBLE PRECISION,
    "gpsLongitude" DOUBLE PRECISION,
    "gpsAccuracyM" DOUBLE PRECISION,
    "anomalies" JSONB,
    "riskScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "userRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "ipAddress" TEXT,
    "city" TEXT,
    "district" TEXT,
    "region" TEXT,
    "postal" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isp" TEXT,
    "asn" TEXT,
    "isVpnOrProxy" BOOLEAN,
    "deviceFingerprint" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "login_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trusted_login_locations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "ipAddress" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "asn" TEXT,
    "isp" TEXT,
    "label" TEXT,
    "approvedBy" TEXT,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trusted_login_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_consents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "userRole" TEXT,
    "status" "LocationConsentStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracyM" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_events_tenantId_createdAt_idx" ON "auth_events"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "auth_events_userId_eventType_idx" ON "auth_events"("userId", "eventType");

-- CreateIndex
CREATE INDEX "auth_events_ipAddress_idx" ON "auth_events"("ipAddress");

-- CreateIndex
CREATE INDEX "auth_events_deviceFingerprint_idx" ON "auth_events"("deviceFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "login_sessions_sessionId_key" ON "login_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "login_sessions_tenantId_userId_idx" ON "login_sessions"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "login_sessions_userId_revokedAt_expiresAt_idx" ON "login_sessions"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "trusted_login_locations_tenantId_userId_idx" ON "trusted_login_locations"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "trusted_login_locations_userId_ipAddress_key" ON "trusted_login_locations"("userId", "ipAddress");

-- CreateIndex
CREATE INDEX "location_consents_tenantId_status_idx" ON "location_consents"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "location_consents_userId_key" ON "location_consents"("userId");
