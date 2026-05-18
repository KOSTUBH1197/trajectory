"use client"

import { useRouter } from "next/navigation"
import { Bell, CheckCheck, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn, formatDate } from "@/lib/utils"
import { markNotificationRead, markAllRead } from "@/server/actions/notifications"
import type { Notification } from "@prisma/client"

const TYPE_ICONS: Record<string, { emoji: string; color: string }> = {
  SHEET_SUBMITTED: { emoji: "📋", color: "bg-primary/10" },
  SHEET_APPROVED:  { emoji: "✅", color: "bg-success/10" },
  SHEET_RETURNED:  { emoji: "↩️", color: "bg-warning/10" },
  DEFAULT:         { emoji: "🔔", color: "bg-muted" },
}

export function NotificationsView({ notifications }: { notifications: Notification[] }) {
  const router = useRouter()
  const unread = notifications.filter((n) => !n.read)

  async function handleRead(id: string) {
    await markNotificationRead(id)
    router.refresh()
  }
  async function handleReadAll() {
    await markAllRead()
    router.refresh()
  }

  return (
    <div className="space-y-4 page-enter">
      {unread.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{unread.length}</span> unread
          </span>
          <Button variant="ghost" size="sm" onClick={handleReadAll} className="gap-2 text-xs">
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Bell className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="font-semibold">All clear</p>
            <p className="mt-1 text-sm text-muted-foreground">No notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {notifications.map((n) => {
            const iconCfg = TYPE_ICONS[n.type] ?? TYPE_ICONS.DEFAULT
            return (
              <div
                key={n.id}
                onClick={() => !n.read && handleRead(n.id)}
                className={cn(
                  "group flex items-start gap-4 rounded-xl border p-4 transition-all cursor-pointer",
                  n.read
                    ? "bg-card hover:bg-muted/20"
                    : "bg-card border-l-2 border-l-primary hover:bg-muted/20"
                )}
              >
                {/* Icon */}
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg", iconCfg.color)}>
                  {iconCfg.emoji}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className={cn("text-sm leading-tight", !n.read && "font-semibold")}>{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">{formatDate(n.createdAt)}</p>
                </div>

                {/* Unread dot / link arrow */}
                <div className="flex shrink-0 items-center gap-2">
                  {n.link && (
                    <Link
                      href={n.link}
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                  {!n.read && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
