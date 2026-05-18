"use client"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import type { Role } from "@prisma/client"

interface AppShellProps {
  children: React.ReactNode
  userName: string
  userEmail: string
  userRole: Role
}

export function AppShell({ children, userName, userEmail, userRole }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar role={userRole} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userName={userName} userEmail={userEmail} userRole={userRole} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
