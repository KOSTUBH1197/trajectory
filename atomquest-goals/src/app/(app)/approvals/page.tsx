import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ClipboardCheck, ArrowRight, Clock } from "lucide-react"
import { getStatusColor, formatDate, getInitials, cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { differenceInDays } from "date-fns"

export default async function ApprovalsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role === "EMPLOYEE") redirect("/dashboard")
  const user = session.user

  const sheets = await db.goalSheet.findMany({
    where: {
      status: "SUBMITTED",
      ...(user.role === "MANAGER" ? { employee: { managerId: user.id } } : {}),
    },
    include: { employee: true, cycle: true, goals: true },
    orderBy: { submittedAt: "asc" },
  })

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sheets.length === 0
              ? "No pending approvals"
              : `${sheets.length} sheet${sheets.length !== 1 ? "s" : ""} waiting for review`}
          </p>
        </div>
        {sheets.length > 0 && (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/15 ring-2 ring-warning/20">
            <span className="text-sm font-bold text-warning-foreground">{sheets.length}</span>
          </div>
        )}
      </div>

      {sheets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <ClipboardCheck className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-semibold">All caught up</p>
            <p className="mt-1 text-sm text-muted-foreground">No pending approvals right now.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Employee</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Goals</TableHead>
                <TableHead>Waiting</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sheets.map((sheet) => {
                const waitDays = sheet.submittedAt
                  ? differenceInDays(new Date(), sheet.submittedAt)
                  : 0
                const isUrgent = waitDays >= 3

                return (
                  <TableRow key={sheet.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 ring-2 ring-border">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(sheet.employee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium leading-tight">{sheet.employee.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{sheet.employee.department ?? sheet.employee.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{sheet.cycle.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm font-semibold">{sheet.goals.length}</span>
                    </TableCell>
                    <TableCell>
                      <div className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                        isUrgent
                          ? "bg-warning/10 text-warning-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Clock className="h-3 w-3" />
                        {waitDays === 0 ? "Today" : `${waitDays}d`}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/approvals/${sheet.id}`}>
                          Review
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="opacity-100 group-hover:opacity-0 absolute transition-opacity">
                        <Link href={`/approvals/${sheet.id}`}>
                          Review →
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
