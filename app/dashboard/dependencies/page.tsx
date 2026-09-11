import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"

export const dynamic = 'force-dynamic'

async function getDependencies() {
  return prisma.dependency.findMany({
    include: {
      sourceSystem: {
        select: { id: true, name: true, type: true },
      },
      targetSystem: {
        select: { id: true, name: true, type: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export default async function DependenciesPage() {
  const dependencies = await getDependencies()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Dependencies</h1>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
        Dependencies represent operational relationships between systems, such as applications
        depending on databases, services requiring network connections, or websites depending on
        proxy servers.
      </div>

      {dependencies.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-12 text-center">
          <p className="text-slate-400">No dependencies defined</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dependencies.map((dep) => (
            <div
              key={dep.id}
              className="rounded-lg border border-slate-800 bg-slate-900 p-6"
            >
              <div className="flex items-center gap-4">
                <Link
                  href={`/dashboard/systems/${dep.sourceSystem.id}`}
                  className="flex-1 rounded-md border border-slate-700 bg-slate-800 p-3 hover:bg-slate-700"
                >
                  <div className="font-medium text-white">{dep.sourceSystem.name}</div>
                  <div className="text-xs text-slate-400">
                    {dep.sourceSystem.type.replace(/_/g, ' ')}
                  </div>
                </Link>

                <div className="flex flex-col items-center">
                  <Badge variant="default">{dep.type.replace(/_/g, ' ')}</Badge>
                  <div className="mt-1 text-xs text-slate-500">→</div>
                </div>

                <Link
                  href={`/dashboard/systems/${dep.targetSystem.id}`}
                  className="flex-1 rounded-md border border-slate-700 bg-slate-800 p-3 hover:bg-slate-700"
                >
                  <div className="font-medium text-white">{dep.targetSystem.name}</div>
                  <div className="text-xs text-slate-400">
                    {dep.targetSystem.type.replace(/_/g, ' ')}
                  </div>
                </Link>
              </div>

              {dep.description && (
                <p className="mt-3 text-sm text-slate-300">{dep.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
