-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('HOME_LAB', 'CLOUD', 'REMOTE_SITE', 'OTHER');

-- CreateEnum
CREATE TYPE "SystemType" AS ENUM ('PHYSICAL_SERVER', 'PROXMOX_HOST', 'VPS', 'VIRTUAL_MACHINE', 'CONTAINER', 'NAS', 'STORAGE', 'NETWORK_DEVICE', 'NETWORK_CONNECTION', 'APPLICATION', 'WEBSITE', 'DATABASE', 'SERVICE', 'SECURITY_SERVICE', 'BLOCKCHAIN_NODE', 'OTHER');

-- CreateEnum
CREATE TYPE "SystemStatus" AS ENUM ('ONLINE', 'OFFLINE', 'WARNING', 'MAINTENANCE', 'UNKNOWN', 'RETIRED');

-- CreateEnum
CREATE TYPE "Criticality" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('PRODUCTION', 'STAGING', 'DEVELOPMENT', 'LAB');

-- CreateEnum
CREATE TYPE "DependencyType" AS ENUM ('DEPENDS_ON', 'CONNECTS_TO', 'STORES_DATA_ON', 'ROUTED_THROUGH', 'MONITORED_BY', 'BACKED_UP_TO', 'PROVIDES_SERVICE_TO');

-- CreateEnum
CREATE TYPE "EndpointType" AS ENUM ('URL', 'API', 'SSH', 'MANAGEMENT', 'DATABASE', 'RPC', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('SYSTEM_CREATED', 'SYSTEM_UPDATED', 'SYSTEM_ARCHIVED', 'SYSTEM_PARENT_CHANGED', 'DEPENDENCY_CREATED', 'DEPENDENCY_REMOVED', 'ENDPOINT_CREATED', 'ENDPOINT_UPDATED', 'ENDPOINT_REMOVED', 'LOCATION_CREATED', 'LOCATION_UPDATED', 'LOCATION_ARCHIVED', 'IMPORT_STARTED', 'IMPORT_PREVIEW_GENERATED', 'IMPORT_COMPLETED', 'IMPORT_FAILED', 'IMPORT_SYSTEM_CREATED', 'IMPORT_SYSTEM_UPDATED', 'IMPORT_MAPPING_CREATED', 'IMPORT_CONFLICT_RESOLVED');

-- CreateEnum
CREATE TYPE "ImportSourceType" AS ENUM ('PROXMOX');

-- CreateEnum
CREATE TYPE "ExternalResourceType" AS ENUM ('PROXMOX_NODE', 'PROXMOX_VM', 'PROXMOX_CONTAINER', 'PROXMOX_STORAGE');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PREVIEWED', 'COMPLETED', 'COMPLETED_WITH_WARNINGS', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verificationtokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "description" TEXT,
    "city" TEXT,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "systems" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "SystemType" NOT NULL,
    "status" "SystemStatus" NOT NULL DEFAULT 'UNKNOWN',
    "criticality" "Criticality" NOT NULL,
    "environment" "Environment" NOT NULL,
    "description" TEXT,
    "hostname" TEXT,
    "privateIp" TEXT,
    "publicIp" TEXT,
    "operatingSystem" TEXT,
    "platformVersion" TEXT,
    "vmContainerId" TEXT,
    "cpuAllocation" INTEGER,
    "memoryAllocation" INTEGER,
    "storageAllocation" INTEGER,
    "accessMethod" TEXT,
    "credentialReference" TEXT,
    "owner" TEXT,
    "tags" TEXT[],
    "notes" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "locationId" TEXT NOT NULL,
    "parentSystemId" TEXT,

    CONSTRAINT "systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependencies" (
    "id" TEXT NOT NULL,
    "type" "DependencyType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceSystemId" TEXT NOT NULL,
    "targetSystemId" TEXT NOT NULL,

    CONSTRAINT "dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "endpoints" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EndpointType" NOT NULL,
    "address" TEXT NOT NULL,
    "port" INTEGER,
    "protocol" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "systemId" TEXT,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ImportSourceType" NOT NULL,
    "sourceIdentifier" TEXT NOT NULL,
    "lastSuccessfulImport" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_resource_mappings" (
    "id" TEXT NOT NULL,
    "externalResourceId" TEXT NOT NULL,
    "externalType" "ExternalResourceType" NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "importSourceId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "external_resource_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_runs" (
    "id" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "status" "ImportStatus" NOT NULL,
    "totalResources" INTEGER NOT NULL,
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,
    "missingCount" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "importSourceId" TEXT NOT NULL,
    "initiatedBy" TEXT NOT NULL,

    CONSTRAINT "import_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_token_key" ON "verificationtokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_identifier_token_key" ON "verificationtokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "systems_slug_key" ON "systems"("slug");

-- CreateIndex
CREATE INDEX "systems_locationId_idx" ON "systems"("locationId");

-- CreateIndex
CREATE INDEX "systems_parentSystemId_idx" ON "systems"("parentSystemId");

-- CreateIndex
CREATE INDEX "systems_type_idx" ON "systems"("type");

-- CreateIndex
CREATE INDEX "systems_status_idx" ON "systems"("status");

-- CreateIndex
CREATE INDEX "systems_criticality_idx" ON "systems"("criticality");

-- CreateIndex
CREATE INDEX "systems_environment_idx" ON "systems"("environment");

-- CreateIndex
CREATE INDEX "dependencies_sourceSystemId_idx" ON "dependencies"("sourceSystemId");

-- CreateIndex
CREATE INDEX "dependencies_targetSystemId_idx" ON "dependencies"("targetSystemId");

-- CreateIndex
CREATE UNIQUE INDEX "dependencies_sourceSystemId_targetSystemId_type_key" ON "dependencies"("sourceSystemId", "targetSystemId", "type");

-- CreateIndex
CREATE INDEX "endpoints_systemId_idx" ON "endpoints"("systemId");

-- CreateIndex
CREATE INDEX "audit_events_entityId_idx" ON "audit_events"("entityId");

-- CreateIndex
CREATE INDEX "audit_events_action_idx" ON "audit_events"("action");

-- CreateIndex
CREATE INDEX "audit_events_userId_idx" ON "audit_events"("userId");

-- CreateIndex
CREATE INDEX "audit_events_systemId_idx" ON "audit_events"("systemId");

-- CreateIndex
CREATE INDEX "audit_events_createdAt_idx" ON "audit_events"("createdAt");

-- CreateIndex
CREATE INDEX "import_sources_type_idx" ON "import_sources"("type");

-- CreateIndex
CREATE UNIQUE INDEX "import_sources_type_sourceIdentifier_key" ON "import_sources"("type", "sourceIdentifier");

-- CreateIndex
CREATE INDEX "external_resource_mappings_importSourceId_idx" ON "external_resource_mappings"("importSourceId");

-- CreateIndex
CREATE INDEX "external_resource_mappings_systemId_idx" ON "external_resource_mappings"("systemId");

-- CreateIndex
CREATE INDEX "external_resource_mappings_externalResourceId_idx" ON "external_resource_mappings"("externalResourceId");

-- CreateIndex
CREATE UNIQUE INDEX "external_resource_mappings_importSourceId_externalResourceI_key" ON "external_resource_mappings"("importSourceId", "externalResourceId");

-- CreateIndex
CREATE INDEX "import_runs_importSourceId_idx" ON "import_runs"("importSourceId");

-- CreateIndex
CREATE INDEX "import_runs_initiatedBy_idx" ON "import_runs"("initiatedBy");

-- CreateIndex
CREATE INDEX "import_runs_status_idx" ON "import_runs"("status");

-- CreateIndex
CREATE INDEX "import_runs_startedAt_idx" ON "import_runs"("startedAt");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "systems" ADD CONSTRAINT "systems_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "systems" ADD CONSTRAINT "systems_parentSystemId_fkey" FOREIGN KEY ("parentSystemId") REFERENCES "systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencies" ADD CONSTRAINT "dependencies_sourceSystemId_fkey" FOREIGN KEY ("sourceSystemId") REFERENCES "systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencies" ADD CONSTRAINT "dependencies_targetSystemId_fkey" FOREIGN KEY ("targetSystemId") REFERENCES "systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endpoints" ADD CONSTRAINT "endpoints_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_resource_mappings" ADD CONSTRAINT "external_resource_mappings_importSourceId_fkey" FOREIGN KEY ("importSourceId") REFERENCES "import_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_resource_mappings" ADD CONSTRAINT "external_resource_mappings_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_importSourceId_fkey" FOREIGN KEY ("importSourceId") REFERENCES "import_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_initiatedBy_fkey" FOREIGN KEY ("initiatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
