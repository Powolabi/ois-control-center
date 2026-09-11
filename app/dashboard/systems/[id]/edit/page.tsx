import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { SystemForm } from "@/components/system-form"

export const dynamic = 'force-dynamic'

async function getSystem(id: string) {
  return prisma.system.findUnique({
    where: { id },
  })
}

async function getFormData(systemId: string) {
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

export default async function EditSystemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const system = await getSystem(id)

  if (!system) {
    notFound()
  }

  const { locations, systems } = await getFormData(id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Edit System</h1>
        <p className="mt-2 text-slate-400">{system.name}</p>
      </div>

      <SystemForm
        locations={locations}
        systems={systems}
        initialData={system}
        systemId={system.id}
      />
    </div>
  )
}
