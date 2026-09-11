import { auth } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await auth()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Settings</h1>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Application</h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm text-slate-400">Application Name</dt>
            <dd className="text-slate-200">OIS Control Center</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Default Environment</dt>
            <dd className="text-slate-200">{process.env.DEFAULT_ENVIRONMENT || 'LAB'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Inventory Review Interval</dt>
            <dd className="text-slate-200">
              {process.env.INVENTORY_REVIEW_INTERVAL_DAYS || '30'} days
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Account</h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm text-slate-400">Email</dt>
            <dd className="text-slate-200">{session?.user?.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Name</dt>
            <dd className="text-slate-200">{session?.user?.name || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Role</dt>
            <dd className="text-slate-200">Owner</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Phase 1 Scope</h2>
        <p className="text-sm text-slate-400">
          This version includes system inventory, location management, and dependency tracking.
          Future phases will add Proxmox integration, monitoring, and automation capabilities.
        </p>
      </div>
    </div>
  )
}
