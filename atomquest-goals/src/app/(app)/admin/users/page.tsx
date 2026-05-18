import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { UsersManager } from "./users-manager"

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard")

  const users = await db.user.findMany({
    include: { manager: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  })

  const managers = users.filter((u) => u.role === "MANAGER" || u.role === "ADMIN")

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <UsersManager users={users} managers={managers} />
    </div>
  )
}
