"use client"

import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { LogOut, ChevronDown, Zap } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getInitials, cn } from "@/lib/utils"
import type { Role } from "@prisma/client"

const DEMO_USERS = [
  { email: "priya.employee@atomquest.demo",   name: "Priya Sharma",   role: "EMPLOYEE" as Role, dept: "Sales" },
  { email: "vikram.employee@atomquest.demo",  name: "Vikram Nair",    role: "EMPLOYEE" as Role, dept: "Sales" },
  { email: "ananya.employee@atomquest.demo",  name: "Ananya Singh",   role: "EMPLOYEE" as Role, dept: "Sales" },
  { email: "rohit.employee@atomquest.demo",   name: "Rohit Desai",    role: "EMPLOYEE" as Role, dept: "Engineering" },
  { email: "sneha.employee@atomquest.demo",   name: "Sneha Kumar",    role: "EMPLOYEE" as Role, dept: "Engineering" },
  { email: "karthik.employee@atomquest.demo", name: "Karthik Rajan",  role: "EMPLOYEE" as Role, dept: "Engineering" },
  { email: "arjun.manager@atomquest.demo",    name: "Arjun Kapoor",   role: "MANAGER"  as Role, dept: "Sales" },
  { email: "meera.manager@atomquest.demo",    name: "Meera Iyer",     role: "MANAGER"  as Role, dept: "Engineering" },
  { email: "raj.admin@atomquest.demo",        name: "Raj Patel",      role: "ADMIN"    as Role, dept: "Leadership" },
]

const ROLE_BADGE: Record<Role, string> = {
  ADMIN:    "bg-primary/10 text-primary",
  MANAGER:  "bg-warning/20 text-warning-foreground",
  EMPLOYEE: "bg-success/15 text-success",
}

interface TopbarProps {
  userName: string
  userEmail: string
  userRole: Role
}

export function Topbar({ userName, userEmail, userRole }: TopbarProps) {
  const router = useRouter()

  async function switchUser(email: string) {
    await signOut({ redirect: false })
    router.push(`/login?demo=${encodeURIComponent(email)}`)
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-5">
      {/* Left: breadcrumb placeholder / page title injected via layout */}
      <div />

      <div className="flex items-center gap-2">
        {/* Demo switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5",
              "text-xs font-medium text-muted-foreground transition-colors",
              "hover:border-border-strong hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}>
              <Zap className="h-3.5 w-3.5 text-warning" />
              <span>Demo</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-xs">Switch Demo User</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {["EMPLOYEE", "MANAGER", "ADMIN"].map((role) => {
              const users = DEMO_USERS.filter((u) => u.role === role)
              return (
                <div key={role}>
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {role}
                  </p>
                  {users.map((u) => (
                    <DropdownMenuItem
                      key={u.email}
                      onClick={() => switchUser(u.email)}
                      className="gap-2.5 py-2"
                    >
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-[10px]">{getInitials(u.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{u.dept}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium leading-tight">{userName}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{userRole}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="pb-2">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
              </div>
              <div className="mt-2">
                <span className={cn("text-[10px] font-semibold rounded-full px-2 py-0.5", ROLE_BADGE[userRole])}>
                  {userRole}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-destructive focus:text-destructive gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
