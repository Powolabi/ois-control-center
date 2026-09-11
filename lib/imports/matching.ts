import { prisma } from "@/lib/prisma"
import { NormalizedSystem, MatchResult } from "./types"
import { calculateFieldChanges } from "./normalization"

export async function matchResources(
  normalizedSystems: NormalizedSystem[],
  importSourceId: string
): Promise<MatchResult[]> {
  const results: MatchResult[] = []

  const existingMappings = await prisma.externalResourceMapping.findMany({
    where: {
      importSourceId,
    },
    include: {
      system: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          hostname: true,
          platformVersion: true,
          vmContainerId: true,
          cpuAllocation: true,
          memoryAllocation: true,
          storageAllocation: true,
        },
      },
    },
  })

  const mappingsByExternalId = new Map(
    existingMappings.map((m) => [m.externalResourceId, m])
  )

  const currentExternalIds = new Set(
    normalizedSystems.map((s) => s.externalId)
  )

  const missingMappings = existingMappings.filter(
    (m) => !currentExternalIds.has(m.externalResourceId)
  )

  for (const normalized of normalizedSystems) {
    const match = await matchSingleResource(
      normalized,
      mappingsByExternalId,
      importSourceId
    )
    results.push(match)
  }

  for (const missing of missingMappings) {
    results.push({
      externalId: missing.externalResourceId,
      name: missing.system.name,
      matchType: "missing",
      existingSystemId: missing.systemId,
      existingSystem: {
        id: missing.system.id,
        name: missing.system.name,
        type: missing.system.type,
        status: missing.system.status,
      },
      warnings: [
        "This resource was previously imported but is not present in the current export",
      ],
    })
  }

  return results
}

async function matchSingleResource(
  normalized: NormalizedSystem,
  mappingsByExternalId: Map<string, any>,
  importSourceId: string
): Promise<MatchResult> {
  const existingMapping = mappingsByExternalId.get(normalized.externalId)

  if (existingMapping) {
    return matchExistingMapping(normalized, existingMapping)
  }

  const possibleMatches = await findPossibleMatches(normalized)

  if (possibleMatches.length === 0) {
    return {
      externalId: normalized.externalId,
      name: normalized.name,
      matchType: "new",
    }
  }

  if (possibleMatches.length === 1) {
    const candidate = possibleMatches[0]
    return {
      externalId: normalized.externalId,
      name: normalized.name,
      matchType: "conflict",
      conflictCandidates: [
        {
          id: candidate.id,
          name: candidate.name,
          type: candidate.type,
          reason: "Similar name and type but no existing mapping",
        },
      ],
      warnings: [
        "Possible match found but requires manual confirmation to avoid duplicates",
      ],
    }
  }

  return {
    externalId: normalized.externalId,
    name: normalized.name,
    matchType: "conflict",
    conflictCandidates: possibleMatches.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      reason: "Multiple possible matches found",
    })),
    warnings: [
      "Multiple possible matches found - manual selection required",
    ],
  }
}

function matchExistingMapping(
  normalized: NormalizedSystem,
  mapping: any
): MatchResult {
  const existingSystem = mapping.system
  const changes = calculateFieldChanges(existingSystem, normalized)

  if (Object.keys(changes).length === 0) {
    return {
      externalId: normalized.externalId,
      name: normalized.name,
      matchType: "unchanged",
      existingSystemId: existingSystem.id,
      existingSystem: {
        id: existingSystem.id,
        name: existingSystem.name,
        type: existingSystem.type,
        status: existingSystem.status,
      },
    }
  }

  return {
    externalId: normalized.externalId,
    name: normalized.name,
    matchType: "changed",
    existingSystemId: existingSystem.id,
    existingSystem: {
      id: existingSystem.id,
      name: existingSystem.name,
      type: existingSystem.type,
      status: existingSystem.status,
    },
    proposedChanges: changes,
  }
}

async function findPossibleMatches(
  normalized: NormalizedSystem
): Promise<Array<{ id: string; name: string; type: any }>> {
  if (normalized.vmContainerId) {
    const vmMatches = await prisma.system.findMany({
      where: {
        type: normalized.type,
        vmContainerId: normalized.vmContainerId,
        archivedAt: null,
        externalMappings: {
          none: {},
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
      },
      take: 5,
    })

    if (vmMatches.length > 0) {
      return vmMatches as any
    }
  }

  return []
}

export function summarizeMatches(matches: MatchResult[]): {
  new: number
  changed: number
  unchanged: number
  missing: number
  conflicts: number
} {
  return {
    new: matches.filter((m) => m.matchType === "new").length,
    changed: matches.filter((m) => m.matchType === "changed").length,
    unchanged: matches.filter((m) => m.matchType === "unchanged").length,
    missing: matches.filter((m) => m.matchType === "missing").length,
    conflicts: matches.filter((m) => m.matchType === "conflict").length,
  }
}
