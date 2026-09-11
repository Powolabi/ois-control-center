import { ProxmoxExport, ProxmoxSystem, NormalizedSystem } from "./types"
import {
  mapProxmoxStatusToSystemStatus,
  mapProxmoxTypeToSystemType,
  mapProxmoxTypeToExternalType,
} from "./status-mapping"

export function normalizeProxmoxExport(
  exportData: ProxmoxExport
): NormalizedSystem[] {
  const normalized: NormalizedSystem[] = []
  const relationshipMap = buildRelationshipMap(exportData)

  for (const system of exportData.systems) {
    normalized.push(normalizeSystem(system, relationshipMap))
  }

  return normalized
}

function buildRelationshipMap(
  exportData: ProxmoxExport
): Map<string, string | null> {
  const map = new Map<string, string | null>()

  for (const rel of exportData.relationships) {
    if (rel.type === "HOSTED_ON" || rel.type === "ATTACHED_TO") {
      map.set(rel.sourceExternalId, rel.targetExternalId)
    }
  }

  return map
}

function normalizeSystem(
  system: ProxmoxSystem,
  relationshipMap: Map<string, string | null>
): NormalizedSystem {
  const externalType = mapProxmoxTypeToExternalType(system.type)
  const systemType = mapProxmoxTypeToSystemType(system.type)
  const status = mapProxmoxStatusToSystemStatus(system.status)

  const vmContainerId = system.vmId ? String(system.vmId) : null

  const cpuAllocation = system.cpuAllocated || null
  const memoryAllocation = system.memoryAllocatedBytes
    ? Math.ceil(system.memoryAllocatedBytes / (1024 * 1024))
    : null
  const storageAllocation = system.storageAllocatedBytes
    ? Math.ceil(system.storageAllocatedBytes / (1024 * 1024 * 1024))
    : null

  const parentExternalId = relationshipMap.get(system.externalId) || null

  const metadata: Record<string, any> = {
    ...(system.metadata || {}),
    proxmoxNode: system.nodeName,
    cpuUsagePercent: system.cpuUsagePercent,
    memoryUsedBytes: system.memoryUsedBytes,
    storageUsedBytes: system.storageUsedBytes,
  }

  return {
    externalId: system.externalId,
    externalType,
    name: system.name,
    type: systemType as any,
    status,
    hostname: system.hostname || null,
    description: system.description || null,
    platformVersion: system.platformVersion || null,
    vmContainerId,
    cpuAllocation,
    memoryAllocation,
    storageAllocation,
    parentExternalId,
    metadata,
  }
}

export function shouldUpdateField(
  fieldName: string,
  existingValue: any,
  importedValue: any
): boolean {
  const importOwnedFields = [
    "status",
    "vmContainerId",
    "cpuAllocation",
    "memoryAllocation",
    "storageAllocation",
    "platformVersion",
    "hostname",
  ]

  if (!importOwnedFields.includes(fieldName)) {
    return false
  }

  if (importedValue === null || importedValue === undefined || importedValue === "") {
    return false
  }

  return existingValue !== importedValue
}

export function calculateFieldChanges(
  existingSystem: Record<string, any>,
  normalizedSystem: NormalizedSystem
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {}

  const fieldsToCheck = [
    "status",
    "hostname",
    "platformVersion",
    "vmContainerId",
    "cpuAllocation",
    "memoryAllocation",
    "storageAllocation",
  ]

  for (const field of fieldsToCheck) {
    const existingValue = existingSystem[field]
    const newValue = (normalizedSystem as any)[field]

    if (shouldUpdateField(field, existingValue, newValue)) {
      changes[field] = { old: existingValue, new: newValue }
    }
  }

  return changes
}
