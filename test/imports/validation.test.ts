import { describe, it, expect } from "vitest"
import {
  validateFileSize,
  validateJsonSyntax,
  validateSchemaVersion,
  sanitizeErrorMessage,
} from "@/lib/imports/validation"

describe("Import Validation", () => {
  describe("validateFileSize", () => {
    it("should accept files under 10MB", () => {
      const buffer = Buffer.alloc(1024 * 1024)
      const result = validateFileSize(buffer)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("should reject files over 10MB", () => {
      const buffer = Buffer.alloc(11 * 1024 * 1024)
      const result = validateFileSize(buffer)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe("validateJsonSyntax", () => {
    it("should accept valid JSON", () => {
      const json = JSON.stringify({ test: "data" })
      const result = validateJsonSyntax(json)
      expect(result.valid).toBe(true)
      expect(result.export).toEqual({ test: "data" })
    })

    it("should reject invalid JSON", () => {
      const json = "{ invalid json }"
      const result = validateJsonSyntax(json)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe("validateSchemaVersion", () => {
    it("should accept version 1.0", () => {
      const data = { schemaVersion: "1.0" } as any
      const result = validateSchemaVersion(data)
      expect(result.valid).toBe(true)
    })

    it("should reject unsupported versions", () => {
      const data = { schemaVersion: "2.0" } as any
      const result = validateSchemaVersion(data)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain("Unsupported schema version")
    })

    it("should reject missing version", () => {
      const data = {} as any
      const result = validateSchemaVersion(data)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain("Missing schemaVersion")
    })
  })

  describe("sanitizeErrorMessage", () => {
    it("should redact passwords", () => {
      const error = new Error("Connection failed with password=secret123")
      const sanitized = sanitizeErrorMessage(error)
      expect(sanitized).toContain("[REDACTED]")
      expect(sanitized).not.toContain("secret123")
    })

    it("should redact tokens", () => {
      const error = new Error("Auth failed: token=abc123xyz")
      const sanitized = sanitizeErrorMessage(error)
      expect(sanitized).toContain("[REDACTED]")
      expect(sanitized).not.toContain("abc123xyz")
    })

    it("should redact filesystem paths", () => {
      const error = new Error("File not found: /home/user/secret/file.txt")
      const sanitized = sanitizeErrorMessage(error)
      expect(sanitized).toContain("[REDACTED]")
      expect(sanitized).not.toContain("/home/user/secret/file.txt")
    })

    it("should truncate long messages", () => {
      const longMessage = "A".repeat(1000)
      const error = new Error(longMessage)
      const sanitized = sanitizeErrorMessage(error)
      expect(sanitized.length).toBeLessThanOrEqual(500)
    })
  })
})
