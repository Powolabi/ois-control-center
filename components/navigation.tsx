"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Systems", href: "/dashboard/systems" },
  { name: "Monitoring", href: "/dashboard/monitoring" },
  { name: "Incidents", href: "/dashboard/incidents" },
  { name: "Locations", href: "/dashboard/locations" },
  { name: "Dependencies", href: "/dashboard/dependencies" },
  { name: "Settings", href: "/dashboard/settings" },
]

export function Navigation() {
  const pathname = usePathname()

  async function handleSignOut() {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <nav className="border-b border-slate-800 bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <span className="text-xl font-bold text-white">OIS Control Center</span>
            </div>
            <div className="ml-10 flex space-x-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium transition-colors",
                    pathname === item.href || pathname?.startsWith(item.href + "/")
                      ? "border-ops-blue-500 text-white"
                      : "border-transparent text-slate-400 hover:text-white"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
