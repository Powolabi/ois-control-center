import { describe, it, expect, vi } from "vitest"
import { createAuditEvent } from "@/lib/audit"

describe("createAuditEvent transactional client", () => {
  it("writes through the provided client so import transactions can see newly created systems", async () => {
    const create = vi.fn().mockResolvedValue({ id: "audit-1" })

    await createAuditEvent({
      action: "IMPORT_SYSTEM_CREATED",
      entityId: "sys-1",
      userId: "user-1",
      systemId: "sys-1",
      client: { auditEvent: { create } } as any,
      metadata: { importRunId: "run-1" },
    })

    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0][0].data).toMatchObject({
      action: "IMPORT_SYSTEM_CREATED",
      entityId: "sys-1",
      userId: "user-1",
      systemId: "sys-1",
    })
  })
})
