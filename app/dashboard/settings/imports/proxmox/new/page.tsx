import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProxmoxImportForm } from "@/components/proxmox-import-form"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function NewProxmoxImportPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const locations = await prisma.location.findMany({
    where: {
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  })

  if (locations.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">New Proxmox Import</h1>
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-6">
          <h3 className="text-lg font-semibold text-yellow-400">No Locations Available</h3>
          <p className="mt-2 text-sm text-slate-300">
            You need to create at least one location before importing Proxmox inventory.
          </p>
          <a
            href="/dashboard/locations"
            className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Manage Locations
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">New Proxmox Import</h1>
        <p className="mt-2 text-slate-400">
          Import infrastructure inventory from a Proxmox VE cluster export
        </p>
      </div>

      <ProxmoxImportForm locations={locations} />
    </div>
  )
}
