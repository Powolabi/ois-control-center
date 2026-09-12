import { prisma } from "@/lib/prisma"
import { createAuditEvent } from "@/lib/audit"
import { slugify } from "@/lib/utils"
import {
  NormalizedSystem,
  MatchResult,
  ImportExecutionResult,
  ConflictResolution,
} from "./types"
import { Criticality, Environment } from "@prisma/client"

export async function executeImport(
  normalizedSystems: NormalizedSystem[],
  matches: MatchResult[],
  importSourceId: string,
  importRunId: string,
  userId: string,
  locationId: string,
  conflictResolutions: ConflictResolution[]
): Promise<ImportExecutionResult> {
  const resolutionMap = new Map(
    conflictResolutions.map((r) => [r.externalId, r])
  )

  const createdSystems: Array<{ id: string; name: string }> = []
  const updatedSystems: Array<{ id: string; name: string }> = []
  const errors: string[] = []

  let newCount = 0
  let updatedCount = 0
  let unchangedCount = 0
  let missingCount = 0
  let conflictCount = 0
  let warningCount = 0

  const systemsByExternalId = new Map(
    normalizedSystems.map((s) => [s.externalId, s])
  )

  try {
    await prisma.$transaction(async (tx) => {
      const createdSystemIds = new Map<string, string>()

      for (const match of matches) {
        if (match.matchType === "missing") {
          missingCount++
          continue
        }

        const normalized = systemsByExternalId.get(match.externalId)
        if (!normalized) continue

        if (match.matchType === "unchanged") {
          unchangedCount++
          await tx.externalResourceMapping.update({
            where: {
              importSourceId_externalResourceId: {
                importSourceId,
                externalResourceId: match.externalId,
              },
            },
            data: {
              lastSeenAt: new Date(),
            },
          })
          continue
        }

        if (match.matchType === "conflict") {
          const resolution = resolutionMap.get(match.externalId)
          if (!resolution) {
            conflictCount++
            continue
          }

          if (resolution.action === "skip") {
            conflictCount++
            continue
          }

          if (resolution.action === "create_new") {
            const system = await createSystem(
              tx,
              normalized,
              locationId,
              createdSystemIds
            )
            createdSystemIds.set(normalized.externalId, system.id)
            await createMapping(
              tx,
              importSourceId,
              normalized.externalId,
              normalized.externalType,
              system.id
            )
            createdSystems.push({ id: system.id, name: system.name })
            newCount++

            await createAuditEvent({
              action: "IMPORT_SYSTEM_CREATED",
              entityId: system.id,
              userId,
              systemId: system.id,
              client: tx,
              metadata: {
                importRunId,
                externalId: normalized.externalId,
                source: "proxmox",
              },
            })
            continue
          }

          if (resolution.action === "match_existing" && resolution.systemId) {
            await updateExistingSystem(
              tx,
              resolution.systemId,
              normalized,
              match.proposedChanges || {}
            )
            await createMapping(
              tx,
              importSourceId,
              normalized.externalId,
              normalized.externalType,
              resolution.systemId
            )
            updatedSystems.push({
              id: resolution.systemId,
              name: normalized.name,
            })
            updatedCount++

            await createAuditEvent({
              action: "IMPORT_SYSTEM_UPDATED",
              entityId: resolution.systemId,
              userId,
              systemId: resolution.systemId,
              client: tx,
              metadata: {
                importRunId,
                externalId: normalized.externalId,
                changes: match.proposedChanges,
              },
            })
            continue
          }
        }

        if (match.matchType === "new") {
          const system = await createSystem(
            tx,
            normalized,
            locationId,
            createdSystemIds
          )
          createdSystemIds.set(normalized.externalId, system.id)
          await createMapping(
            tx,
            importSourceId,
            normalized.externalId,
            normalized.externalType,
            system.id
          )
          createdSystems.push({ id: system.id, name: system.name })
          newCount++

          await createAuditEvent({
            action: "IMPORT_SYSTEM_CREATED",
            entityId: system.id,
            userId,
            systemId: system.id,
            client: tx,
            metadata: {
              importRunId,
              externalId: normalized.externalId,
              source: "proxmox",
            },
          })
          continue
        }

        if (match.matchType === "changed" && match.existingSystemId) {
          await updateExistingSystem(
            tx,
            match.existingSystemId,
            normalized,
            match.proposedChanges || {}
          )
          await tx.externalResourceMapping.update({
            where: {
              importSourceId_externalResourceId: {
                importSourceId,
                externalResourceId: match.externalId,
              },
            },
            data: {
              lastSeenAt: new Date(),
            },
          })
          updatedSystems.push({
            id: match.existingSystemId,
            name: normalized.name,
          })
          updatedCount++

          await createAuditEvent({
            action: "IMPORT_SYSTEM_UPDATED",
            entityId: match.existingSystemId,
            userId,
            systemId: match.existingSystemId,
            client: tx,
            metadata: {
              importRunId,
              externalId: normalized.externalId,
              changes: match.proposedChanges,
            },
          })
        }
      }

      await updateParentRelationships(
        tx,
        normalizedSystems,
        importSourceId,
        createdSystemIds
      )

      await tx.importRun.update({
        where: { id: importRunId },
        data: {
          status: conflictCount > 0 ? "COMPLETED_WITH_WARNINGS" : "COMPLETED",
          newCount,
          updatedCount,
          unchangedCount,
          missingCount,
          conflictCount,
          warningCount,
          completedAt: new Date(),
        },
      })

      await tx.importSource.update({
        where: { id: importSourceId },
        data: {
          lastSuccessfulImport: new Date(),
        },
      })
    })

    return {
      importRunId,
      status: conflictCount > 0 ? "COMPLETED_WITH_WARNINGS" : "COMPLETED",
      totalResources: matches.length,
      newCount,
      updatedCount,
      unchangedCount,
      missingCount,
      conflictCount,
      warningCount,
      createdSystems,
      updatedSystems,
    }
  } catch (error: any) {
    errors.push(error.message)

    await prisma.importRun.update({
      where: { id: importRunId },
      data: {
        status: "FAILED",
        errorSummary: error.message,
        completedAt: new Date(),
      },
    })

    return {
      importRunId,
      status: "FAILED",
      totalResources: matches.length,
      newCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      missingCount: 0,
      conflictCount: 0,
      warningCount: 0,
      errors,
      createdSystems: [],
      updatedSystems: [],
    }
  }
}

async function createSystem(
  tx: any,
  normalized: NormalizedSystem,
  locationId: string,
  createdSystemIds: Map<string, string>
) {
  const slug = await generateUniqueSlug(tx, normalized.name)

  let parentSystemId: string | null = null
  if (normalized.parentExternalId) {
    parentSystemId = createdSystemIds.get(normalized.parentExternalId) || null
  }

  return tx.system.create({
    data: {
      name: normalized.name,
      slug,
      type: normalized.type,
      status: normalized.status,
      hostname: normalized.hostname,
      description: normalized.description,
      platformVersion: normalized.platformVersion,
      vmContainerId: normalized.vmContainerId,
      cpuAllocation: normalized.cpuAllocation,
      memoryAllocation: normalized.memoryAllocation,
      storageAllocation: normalized.storageAllocation,
      locationId,
      parentSystemId,
      criticality: "MEDIUM" as Criticality,
      environment: "PRODUCTION" as Environment,
      tags: [],
    },
  })
}

async function updateExistingSystem(
  tx: any,
  systemId: string,
  normalized: NormalizedSystem,
  proposedChanges: Record<string, { old: any; new: any }>
) {
  const updateData: any = {}

  for (const [field, change] of Object.entries(proposedChanges)) {
    updateData[field] = change.new
  }

  if (Object.keys(updateData).length > 0) {
    await tx.system.update({
      where: { id: systemId },
      data: updateData,
    })
  }
}

async function createMapping(
  tx: any,
  importSourceId: string,
  externalResourceId: string,
  externalType: string,
  systemId: string
) {
  await tx.externalResourceMapping.upsert({
    where: {
      importSourceId_externalResourceId: {
        importSourceId,
        externalResourceId,
      },
    },
    create: {
      importSourceId,
      externalResourceId,
      externalType,
      systemId,
      lastSeenAt: new Date(),
    },
    update: {
      lastSeenAt: new Date(),
    },
  })
}

async function updateParentRelationships(
  tx: any,
  normalizedSystems: NormalizedSystem[],
  importSourceId: string,
  createdSystemIds: Map<string, string>
) {
  const mappings = await tx.externalResourceMapping.findMany({
    where: { importSourceId },
    select: {
      externalResourceId: true,
      systemId: true,
    },
  })

  const externalToSystemId = new Map(
    mappings.map((m: { externalResourceId: string; systemId: string }) => [m.externalResourceId, m.systemId])
  )

  for (const [extId, sysId] of createdSystemIds) {
    externalToSystemId.set(extId, sysId)
  }

  for (const normalized of normalizedSystems) {
    if (!normalized.parentExternalId) continue

    const systemId = externalToSystemId.get(normalized.externalId)
    const parentSystemId = externalToSystemId.get(normalized.parentExternalId)

    if (!systemId || !parentSystemId) continue

    if (systemId === parentSystemId) continue

    if (!parentSystemId || !systemId) continue

    const hasCircular = await checkCircularHierarchy(
      tx,
      parentSystemId as string,
      [systemId as string]
    )
    if (hasCircular) continue

    await tx.system.update({
      where: { id: systemId },
      data: { parentSystemId },
    })
  }
}

async function checkCircularHierarchy(
  tx: any,
  systemId: string,
  visited: string[]
): Promise<boolean> {
  if (visited.includes(systemId)) {
    return true
  }

  const system = await tx.system.findUnique({
    where: { id: systemId },
    select: { parentSystemId: true },
  })

  if (!system?.parentSystemId) {
    return false
  }

  return checkCircularHierarchy(tx, system.parentSystemId as string, [
    ...visited,
    systemId,
  ])
}

async function generateUniqueSlug(tx: any, name: string): Promise<string> {
  const baseSlug = slugify(name)
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await tx.system.findUnique({
      where: { slug },
    })

    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${counter}`
    counter++
  }
}
