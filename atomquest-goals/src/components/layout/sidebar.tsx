"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Target, CheckSquare, Users, ClipboardCheck,
  BarChart3, Bell, UserCog, RefreshCcw, ChevronLeft, ChevronRight,
  Shield, Layers, Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import type { Role } from "@prisma/client"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: Role[]
}

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard, roles: ["EMPLOYEE","MANAGER","ADMIN"] },
      { href: "/goals",        label: "My Goals",     icon: Target,          roles: ["EMPLOYEE","MANAGER","ADMIN"] },
      { href: "/checkins",     label: "Check-ins",    icon: CheckSquare,     roles: ["EMPLOYEE","MANAGER","ADMIN"] },
      { href: "/notifications",label: "Notifications",icon: Bell,            roles: ["EMPLOYEE","MANAGER","ADMIN"] },
    ] as NavItem[],
  },
  {
    label: "Management",
    items: [
      { href: "/team",          label: "Team",          icon: Users,         roles: ["MANAGER","ADMIN"] },
      { href: "/approvals",     label: "Approvals",     icon: ClipboardCheck,roles: ["MANAGER","ADMIN"] },
      { href: "/team-checkins", label: "Team Check-ins",icon: RefreshCcw,    roles: ["MANAGER","ADMIN"] },
      { href: "/analytics",     label: "Analytics",     icon: BarChart3,     roles: ["MANAGER","ADMIN"] },
    ] as NavItem[],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/users",        label: "Users",         icon: UserCog,      roles: ["ADMIN"] },
      { href: "/admin/cycles",       label: "Cycles",        icon: Layers,       roles: ["ADMIN"] },
      { href: "/admin/thrust-areas", label: "Thrust Areas",  icon: Settings,     roles: ["ADMIN"] },
      { href: "/admin/sheets",       label: "Sheet Override",icon: ClipboardCheck,roles: ["ADMIN"] },
      { href: "/admin/audit",        label: "Audit Trail",   icon: Shield,       roles: ["ADMIN"] },
    ] as NavItem[],
  },
]

interface SidebarProps {
  role: Role
  collapsed: boolean
  onToggle: () => void
}

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            aria-label={item.label}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-all",
        active
          ? "bg-primary/8 text-primary font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="truncate">{item.label}</span>
      {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
    </Link>
  )
}

export function Sidebar({ role, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/")

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-border bg-sidebar-bg transition-all duration-200 ease-in-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex h-14 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center" : "gap-2.5 px-4"
        )}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/30">
            <span className="text-xs font-bold text-primary-foreground">AQ</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold leading-tight truncate">AtomQuest Goals</p>
              <p className="text-xs text-muted-foreground truncate">{role.charAt(0) + role.slice(1).toLowerCase()}</p>
            </div>
          )}
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3">
          <div className={cn("space-y-5", collapsed ? "px-1.5" : "px-3")}>
            {NAV_GROUPS.map((group) => {
              const visible = group.items.filter((item) => item.roles.includes(role))
              if (visible.length === 0) return null
              return (
                <div key={group.label}>
                  {!collapsed && (
                    <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      {group.label}
                    </p>
                  )}
                  <div className={cn("space-y-0.5", collapsed && "flex flex-col items-center space-y-1")}>
                    {visible.map((item) => (
                      <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </nav>

        {/* Toggle */}
        <div className={cn("shrink-0 border-t border-border p-2", collapsed ? "flex justify-center" : "")}>
          <button
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              collapsed ? "h-9 w-9" : "h-8 w-full gap-2 px-2.5 text-xs"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
