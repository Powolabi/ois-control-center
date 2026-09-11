import { prisma } from "@/lib/prisma"
import { SystemForm } from "@/components/system-form"

export const dynamic = 'force-dynamic'

async function getFormData() {
  const [locations, systems] = await Promise.all([
    prisma.location.findMany({
      where: { archivedAt: null },
      orderBy: { name: 'asc' },
    }),
    prisma.system.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return { locations, systems }
}

export default async function NewSystemPage() {
  const { locations, systems } = await getFormData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Register System</h1>
        <p className="mt-2 text-slate-400">
          Add a new system to the inventory
        </p>
      </div>

      <SystemForm locations={locations} systems={systems} />
    </div>
  )
}
