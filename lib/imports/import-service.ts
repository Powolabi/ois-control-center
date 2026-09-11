import { prisma } from "@/lib/prisma"
import { createAuditEvent } from "@/lib/audit"
import {
  validateProxmoxExport,
  sanitizeErrorMessage,
} from "./validation"
import { normalizeProxmoxExport } from "./normalization"
import { matchResources, summarizeMatches } from "./matching"
import { executeImport } from "./execution"
import {
  ProxmoxExport,
  ImportPreview,
  ImportExecutionResult,
  ConflictResolution,
} from "./types"

export async function createOrGetImportSource(
  exportData: ProxmoxExport
): Promise<string> {
  const sourceIdentifier = exportData.source.name

  const existingSource = await prisma.importSource.findUnique({
    where: {
      type_sourceIdentifier: {
        type: "PROXMOX",
        sourceIdentifier,
      },
    },
  })

  if (existingSource) {
    return existingSource.id
  }

  const newSource = await prisma.importSource.create({
    data: {
      name: exportData.source.name,
      type: "PROXMOX",
      sourceIdentifier,
    },
  })

  return newSource.id
}

export async function generateImportPreview(
  buffer: Buffer,
  userId: string
): Promise<ImportPreview> {
  const validationResult = validateProxmoxExport(buffer)

  if (!validationResult.valid || !validationResult.export) {
    return {
      importSourceId: "",
      importSourceName: "",
      schemaVersion: "",
      generatedAt: new Date(),
      totalResources: 0,
      summary: {
        new: 0,
        changed: 0,
        unchanged: 0,
        missing: 0,
        conflicts: 0,
      },
      matches: [],
      collectorWarnings: [],
      canImport: false,
      errors: validationResult.errors,
    }
  }

  const exportData = validationResult.export
  const importSourceId = await createOrGetImportSource(exportData)

  const importSource = await prisma.importSource.findUnique({
    where: { id: importSourceId },
  })

  const normalized = normalizeProxmoxExport(exportData)
  const matches = await matchResources(normalized, importSourceId)
  const summary = summarizeMatches(matches)

  const canImport = validationResult.errors.length === 0

  const importRun = await prisma.importRun.create({
    data: {
      importSourceId,
      schemaVersion: exportData.schemaVersion,
      generatedAt: new Date(exportData.generatedAt),
      status: "PREVIEWED",
      totalResources: exportData.systems.length,
      initiatedBy: userId,
      warningCount: exportData.warnings.length,
    },
  })

  await createAuditEvent({
    action: "IMPORT_PREVIEW_GENERATED",
    entityId: importRun.id,
    userId,
    metadata: {
      importRunId: importRun.id,
      importSourceId,
      totalResources: exportData.systems.length,
      summary,
    },
  })

  return {
    importSourceId,
    importSourceName: importSource?.name || exportData.source.name,
    schemaVersion: exportData.schemaVersion,
    generatedAt: new Date(exportData.generatedAt),
    totalResources: exportData.systems.length,
    summary,
    matches,
    collectorWarnings: exportData.warnings,
    canImport,
  }
}

export async function executeProxmoxImport(
  buffer: Buffer,
  userId: string,
  locationId: string,
  conflictResolutions: ConflictResolution[]
): Promise<ImportExecutionResult> {
  try {
    const validationResult = validateProxmoxExport(buffer)

    if (!validationResult.valid || !validationResult.export) {
      throw new Error(
        validationResult.errors.join("; ") || "Invalid export file"
      )
    }

    const exportData = validationResult.export
    const importSourceId = await createOrGetImportSource(exportData)

    const importRun = await prisma.importRun.create({
      data: {
        importSourceId,
        schemaVersion: exportData.schemaVersion,
        generatedAt: new Date(exportData.generatedAt),
        status: "PREVIEWED",
        totalResources: exportData.systems.length,
        initiatedBy: userId,
        warningCount: exportData.warnings.length,
      },
    })

    await createAuditEvent({
      action: "IMPORT_STARTED",
      entityId: importRun.id,
      userId,
      metadata: {
        importRunId: importRun.id,
        importSourceId,
        totalResources: exportData.systems.length,
      },
    })

    const normalized = normalizeProxmoxExport(exportData)
    const matches = await matchResources(normalized, importSourceId)

    const result = await executeImport(
      normalized,
      matches,
      importSourceId,
      importRun.id,
      userId,
      locationId,
      conflictResolutions
    )

    await createAuditEvent({
      action: result.status === "FAILED" ? "IMPORT_FAILED" : "IMPORT_COMPLETED",
      entityId: importRun.id,
      userId,
      metadata: {
        importRunId: importRun.id,
        status: result.status,
        newCount: result.newCount,
        updatedCount: result.updatedCount,
        unchangedCount: result.unchangedCount,
        conflictCount: result.conflictCount,
      },
    })

    return result
  } catch (error: any) {
    const safeError = sanitizeErrorMessage(error)
    throw new Error(safeError)
  }
}

export async function getImportHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  const runs = await prisma.importRun.findMany({
    where: {
      initiatedBy: userId,
    },
    include: {
      importSource: {
        select: {
          name: true,
          type: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
    take: limit,
    skip: offset,
  })

  return runs
}

export async function getImportRunDetails(importRunId: string, userId: string) {
  const run = await prisma.importRun.findUnique({
    where: {
      id: importRunId,
      initiatedBy: userId,
    },
    include: {
      importSource: {
        select: {
          name: true,
          type: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  return run
}
