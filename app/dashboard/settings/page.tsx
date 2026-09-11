import { auth } from "@/lib/auth"
import Link from "next/link"

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
        <h2 className="mb-4 text-lg font-semibold text-white">Integrations</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white">Proxmox Import</h3>
              <p className="text-sm text-slate-400">
                Import infrastructure inventory from Proxmox VE clusters
              </p>
            </div>
            <Link
              href="/dashboard/settings/imports/proxmox/new"
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Import
            </Link>
          </div>
          <div className="mt-4">
            <Link
              href="/dashboard/settings/imports"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View Import History →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
