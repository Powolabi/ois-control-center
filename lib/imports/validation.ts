import { z } from "zod"
import Ajv from "ajv"
import addFormats from "ajv-formats"
import { ProxmoxExport } from "./types"
import { readFileSync } from "fs"
import { join } from "path"

const SUPPORTED_SCHEMA_VERSIONS = ["1.0"]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

let ajvInstance: Ajv | null = null
let schemaDefinition: any | null = null

function getAjv(): Ajv {
  if (!ajvInstance) {
    ajvInstance = new Ajv({ strict: false, validateFormats: true })
    addFormats(ajvInstance)
  }
  return ajvInstance
}

function getSchemaDefinition(): any {
  if (!schemaDefinition) {
    const schemaPath = join(
      process.cwd(),
      "tools",
      "proxmox-inventory",
      "schemas",
      "inventory-export.schema.json"
    )
    schemaDefinition = JSON.parse(readFileSync(schemaPath, "utf-8"))
  }
  return schemaDefinition
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  export?: ProxmoxExport
}

export function validateFileSize(buffer: Buffer): ValidationResult {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      errors: [
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
      ],
    }
  }
  return { valid: true, errors: [] }
}

export function validateJsonSyntax(content: string): ValidationResult {
  try {
    const parsed = JSON.parse(content) as ProxmoxExport
    return { valid: true, errors: [], export: parsed }
  } catch (error: any) {
    return {
      valid: false,
      errors: [`Invalid JSON syntax: ${error.message}`],
    }
  }
}

export function validateSchemaVersion(data: ProxmoxExport): ValidationResult {
  if (!data.schemaVersion) {
    return {
      valid: false,
      errors: ["Missing schemaVersion field"],
    }
  }

  if (!SUPPORTED_SCHEMA_VERSIONS.includes(data.schemaVersion)) {
    return {
      valid: false,
      errors: [
        `Unsupported schema version: ${data.schemaVersion}. Supported versions: ${SUPPORTED_SCHEMA_VERSIONS.join(", ")}`,
      ],
    }
  }

  return { valid: true, errors: [] }
}

export function validateAgainstSchema(data: any): ValidationResult {
  try {
    const ajv = getAjv()
    const schema = getSchemaDefinition()
    
    const validate = ajv.compile(schema)
    const valid = validate(data)

    if (!valid) {
      const errors = validate.errors?.map((err) => {
        const path = err.instancePath || "root"
        return `${path}: ${err.message}`
      }) || ["Unknown validation error"]
      
      return {
        valid: false,
        errors,
      }
    }

    return { valid: true, errors: [], export: data as ProxmoxExport }
  } catch (error: any) {
    return {
      valid: false,
      errors: [`Schema validation error: ${error.message}`],
    }
  }
}

export function validateExternalIds(data: ProxmoxExport): ValidationResult {
  const errors: string[] = []
  const externalIds = new Set<string>()

  for (const system of data.systems) {
    if (externalIds.has(system.externalId)) {
      errors.push(`Duplicate external ID: ${system.externalId}`)
    }
    externalIds.add(system.externalId)
  }

  for (const rel of data.relationships) {
    if (!externalIds.has(rel.sourceExternalId)) {
      errors.push(
        `Relationship references unknown source: ${rel.sourceExternalId}`
      )
    }
    if (!externalIds.has(rel.targetExternalId)) {
      errors.push(
        `Relationship references unknown target: ${rel.targetExternalId}`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function validateProxmoxExport(
  buffer: Buffer
): ValidationResult {
  const fileSizeResult = validateFileSize(buffer)
  if (!fileSizeResult.valid) {
    return fileSizeResult
  }

  const content = buffer.toString("utf-8")
  const jsonResult = validateJsonSyntax(content)
  if (!jsonResult.valid || !jsonResult.export) {
    return jsonResult
  }

  const versionResult = validateSchemaVersion(jsonResult.export)
  if (!versionResult.valid) {
    return versionResult
  }

  const schemaResult = validateAgainstSchema(jsonResult.export)
  if (!schemaResult.valid) {
    return schemaResult
  }

  const idsResult = validateExternalIds(jsonResult.export)
  if (!idsResult.valid) {
    return idsResult
  }

  return {
    valid: true,
    errors: [],
    export: jsonResult.export,
  }
}

export function sanitizeErrorMessage(error: any): string {
  const message = error?.message || String(error)
  
  const sensitivePatterns = [
    /password[s]?[=:]\s*\S+/gi,
    /token[s]?[=:]\s*\S+/gi,
    /key[s]?[=:]\s*\S+/gi,
    /secret[s]?[=:]\s*\S+/gi,
    /\/[a-z]+\/[a-z]+\/[^\s]+/gi, // filesystem paths
  ]

  let sanitized = message
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, "[REDACTED]")
  }

  return sanitized.substring(0, 500)
}
