import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ThrustAreasManager } from "./thrust-areas-manager"

export default async function ThrustAreasPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard")

  const thrustAreas = await db.thrustArea.findMany({ orderBy: { name: "asc" } })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Thrust Areas</h1>
      <ThrustAreasManager thrustAreas={thrustAreas} />
    </div>
  )
}
