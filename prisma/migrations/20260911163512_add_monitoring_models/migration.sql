-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'DOWN', 'PAUSED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CheckType" AS ENUM ('HTTP', 'TCP', 'HEARTBEAT');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'MONITOR_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MONITOR_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MONITOR_ENABLED';
ALTER TYPE "AuditAction" ADD VALUE 'MONITOR_DISABLED';
ALTER TYPE "AuditAction" ADD VALUE 'MONITOR_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'MANUAL_CHECK_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'INCIDENT_OPENED';
ALTER TYPE "AuditAction" ADD VALUE 'INCIDENT_ACKNOWLEDGED';
ALTER TYPE "AuditAction" ADD VALUE 'INCIDENT_RESOLVED';
ALTER TYPE "AuditAction" ADD VALUE 'HEARTBEAT_TOKEN_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'HEARTBEAT_TOKEN_ROTATED';

-- CreateTable
CREATE TABLE "monitors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "checkType" "CheckType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "intervalSeconds" INTEGER NOT NULL DEFAULT 60,
    "timeoutMs" INTEGER NOT NULL DEFAULT 10000,
    "failureThreshold" INTEGER NOT NULL DEFAULT 3,
    "recoveryThreshold" INTEGER NOT NULL DEFAULT 2,
    "nextCheckAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "currentHealth" "HealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "consecutiveSuccesses" INTEGER NOT NULL DEFAULT 0,
    "workerLeaseOwner" TEXT,
    "workerLeaseExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "systemId" TEXT NOT NULL,

    CONSTRAINT "monitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "http_check_configs" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "expectedStatusMin" INTEGER NOT NULL DEFAULT 200,
    "expectedStatusMax" INTEGER NOT NULL DEFAULT 299,
    "followRedirects" BOOLEAN NOT NULL DEFAULT true,
    "maxRedirects" INTEGER NOT NULL DEFAULT 5,
    "validateTls" BOOLEAN NOT NULL DEFAULT true,
    "expectedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "monitorId" TEXT NOT NULL,

    CONSTRAINT "http_check_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tcp_check_configs" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "monitorId" TEXT NOT NULL,

    CONSTRAINT "tcp_check_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "heartbeat_check_configs" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "monitorId" TEXT NOT NULL,

    CONSTRAINT "heartbeat_check_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_results" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "success" BOOLEAN NOT NULL,
    "healthResult" "HealthStatus" NOT NULL,
    "responseTimeMs" INTEGER,
    "httpStatus" INTEGER,
    "errorCode" TEXT,
    "errorSummary" TEXT,
    "workerIdentifier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monitorId" TEXT NOT NULL,

    CONSTRAINT "check_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "failureSummary" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "monitorId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "firstFailedResultId" TEXT NOT NULL,
    "recoveryResultId" TEXT,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monitors_systemId_idx" ON "monitors"("systemId");

-- CreateIndex
CREATE INDEX "monitors_enabled_idx" ON "monitors"("enabled");

-- CreateIndex
CREATE INDEX "monitors_currentHealth_idx" ON "monitors"("currentHealth");

-- CreateIndex
CREATE INDEX "monitors_nextCheckAt_idx" ON "monitors"("nextCheckAt");

-- CreateIndex
CREATE INDEX "monitors_workerLeaseExpiry_idx" ON "monitors"("workerLeaseExpiry");

-- CreateIndex
CREATE UNIQUE INDEX "http_check_configs_monitorId_key" ON "http_check_configs"("monitorId");

-- CreateIndex
CREATE UNIQUE INDEX "tcp_check_configs_monitorId_key" ON "tcp_check_configs"("monitorId");

-- CreateIndex
CREATE UNIQUE INDEX "heartbeat_check_configs_tokenHash_key" ON "heartbeat_check_configs"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "heartbeat_check_configs_monitorId_key" ON "heartbeat_check_configs"("monitorId");

-- CreateIndex
CREATE INDEX "heartbeat_check_configs_tokenHash_idx" ON "heartbeat_check_configs"("tokenHash");

-- CreateIndex
CREATE INDEX "check_results_monitorId_idx" ON "check_results"("monitorId");

-- CreateIndex
CREATE INDEX "check_results_createdAt_idx" ON "check_results"("createdAt");

-- CreateIndex
CREATE INDEX "check_results_success_idx" ON "check_results"("success");

-- CreateIndex
CREATE INDEX "incidents_monitorId_idx" ON "incidents"("monitorId");

-- CreateIndex
CREATE INDEX "incidents_systemId_idx" ON "incidents"("systemId");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "incidents_openedAt_idx" ON "incidents"("openedAt");

-- AddForeignKey
ALTER TABLE "monitors" ADD CONSTRAINT "monitors_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "http_check_configs" ADD CONSTRAINT "http_check_configs_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tcp_check_configs" ADD CONSTRAINT "tcp_check_configs_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heartbeat_check_configs" ADD CONSTRAINT "heartbeat_check_configs_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_results" ADD CONSTRAINT "check_results_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_firstFailedResultId_fkey" FOREIGN KEY ("firstFailedResultId") REFERENCES "check_results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_recoveryResultId_fkey" FOREIGN KEY ("recoveryResultId") REFERENCES "check_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;
