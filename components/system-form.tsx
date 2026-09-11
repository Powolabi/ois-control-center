"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { SystemType, SystemStatus, Criticality, Environment } from "@prisma/client"
import { slugify } from "@/lib/utils"

interface Location {
  id: string
  name: string
}

interface System {
  id: string
  name: string
  type: SystemType
}

interface SystemFormProps {
  locations: Location[]
  systems: System[]
  initialData?: any
  systemId?: string
}

export function SystemForm({ locations, systems, initialData, systemId }: SystemFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    type: initialData?.type || SystemType.OTHER,
    status: initialData?.status || SystemStatus.UNKNOWN,
    criticality: initialData?.criticality || Criticality.MEDIUM,
    environment: initialData?.environment || Environment.LAB,
    description: initialData?.description || "",
    hostname: initialData?.hostname || "",
    privateIp: initialData?.privateIp || "",
    publicIp: initialData?.publicIp || "",
    operatingSystem: initialData?.operatingSystem || "",
    platformVersion: initialData?.platformVersion || "",
    vmContainerId: initialData?.vmContainerId || "",
    cpuAllocation: initialData?.cpuAllocation || "",
    memoryAllocation: initialData?.memoryAllocation || "",
    storageAllocation: initialData?.storageAllocation || "",
    accessMethod: initialData?.accessMethod || "",
    credentialReference: initialData?.credentialReference || "",
    owner: initialData?.owner || "",
    locationId: initialData?.locationId || "",
    parentSystemId: initialData?.parentSystemId || "",
    tags: initialData?.tags?.join(", ") || "",
    notes: initialData?.notes || "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setLoading(true)

    try {
      const slug = initialData?.slug || slugify(formData.name)
      
      const payload = {
        ...formData,
        slug,
        cpuAllocation: formData.cpuAllocation ? parseInt(formData.cpuAllocation) : null,
        memoryAllocation: formData.memoryAllocation ? parseInt(formData.memoryAllocation) : null,
        storageAllocation: formData.storageAllocation ? parseInt(formData.storageAllocation) : null,
        parentSystemId: formData.parentSystemId || null,
        tags: formData.tags
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean),
      }

      const url = systemId ? `/api/systems/${systemId}` : "/api/systems"
      const method = systemId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save system")
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/dashboard/systems/${data.id}`)
        router.refresh()
      }, 1000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Basic Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">
              Type <span className="text-red-500">*</span>
            </Label>
            <Select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as SystemType })}
              required
              disabled={loading}
            >
              {Object.values(SystemType).map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">
              Status <span className="text-red-500">*</span>
            </Label>
            <Select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as SystemStatus })}
              required
              disabled={loading}
            >
              {Object.values(SystemStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="criticality">
              Criticality <span className="text-red-500">*</span>
            </Label>
            <Select
              id="criticality"
              value={formData.criticality}
              onChange={(e) => setFormData({ ...formData, criticality: e.target.value as Criticality })}
              required
              disabled={loading}
            >
              {Object.values(Criticality).map((crit) => (
                <option key={crit} value={crit}>
                  {crit}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="environment">
              Environment <span className="text-red-500">*</span>
            </Label>
            <Select
              id="environment"
              value={formData.environment}
              onChange={(e) => setFormData({ ...formData, environment: e.target.value as Environment })}
              required
              disabled={loading}
            >
              {Object.values(Environment).map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationId">
              Location <span className="text-red-500">*</span>
            </Label>
            <Select
              id="locationId"
              value={formData.locationId}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              required
              disabled={loading}
            >
              <option value="">Select a location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Network & Access</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="hostname">Hostname</Label>
            <Input
              id="hostname"
              value={formData.hostname}
              onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="privateIp">Private IP Address</Label>
            <Input
              id="privateIp"
              value={formData.privateIp}
              onChange={(e) => setFormData({ ...formData, privateIp: e.target.value })}
              placeholder="192.168.1.100"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="publicIp">Public IP Address</Label>
            <Input
              id="publicIp"
              value={formData.publicIp}
              onChange={(e) => setFormData({ ...formData, publicIp: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessMethod">Access Method</Label>
            <Input
              id="accessMethod"
              value={formData.accessMethod}
              onChange={(e) => setFormData({ ...formData, accessMethod: e.target.value })}
              placeholder="SSH, RDP, Web UI"
              disabled={loading}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="credentialReference">Credential Reference</Label>
            <Input
              id="credentialReference"
              value={formData.credentialReference}
              onChange={(e) => setFormData({ ...formData, credentialReference: e.target.value })}
              placeholder="e.g., Stored in password manager"
              disabled={loading}
            />
            <p className="text-xs text-slate-500">
              Never store actual passwords or keys here
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Technical Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="operatingSystem">Operating System</Label>
            <Input
              id="operatingSystem"
              value={formData.operatingSystem}
              onChange={(e) => setFormData({ ...formData, operatingSystem: e.target.value })}
              placeholder="Ubuntu 22.04"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="platformVersion">Platform/Software Version</Label>
            <Input
              id="platformVersion"
              value={formData.platformVersion}
              onChange={(e) => setFormData({ ...formData, platformVersion: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vmContainerId">VM/Container ID</Label>
            <Input
              id="vmContainerId"
              value={formData.vmContainerId}
              onChange={(e) => setFormData({ ...formData, vmContainerId: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentSystemId">Parent System</Label>
            <Select
              id="parentSystemId"
              value={formData.parentSystemId}
              onChange={(e) => setFormData({ ...formData, parentSystemId: e.target.value })}
              disabled={loading}
            >
              <option value="">None</option>
              {systems
                .filter((s) => s.id !== systemId)
                .map((sys) => (
                  <option key={sys.id} value={sys.id}>
                    {sys.name} ({sys.type.replace(/_/g, " ")})
                  </option>
                ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpuAllocation">CPU Allocation (cores)</Label>
            <Input
              id="cpuAllocation"
              type="number"
              min="0"
              value={formData.cpuAllocation}
              onChange={(e) => setFormData({ ...formData, cpuAllocation: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memoryAllocation">Memory Allocation (GB)</Label>
            <Input
              id="memoryAllocation"
              type="number"
              min="0"
              value={formData.memoryAllocation}
              onChange={(e) => setFormData({ ...formData, memoryAllocation: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="storageAllocation">Storage Allocation (GB)</Label>
            <Input
              id="storageAllocation"
              type="number"
              min="0"
              value={formData.storageAllocation}
              onChange={(e) => setFormData({ ...formData, storageAllocation: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner">Owner/Manager</Label>
            <Input
              id="owner"
              value={formData.owner}
              onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="production, web, docker"
              disabled={loading}
            />
            <p className="text-xs text-slate-500">Comma-separated tags</p>
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-800 bg-red-900/20 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-green-800 bg-green-900/20 p-4 text-sm text-green-400">
          System saved successfully! Redirecting...
        </div>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : systemId ? "Update System" : "Register System"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
