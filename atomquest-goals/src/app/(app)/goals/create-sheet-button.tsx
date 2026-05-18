"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createSheet } from "@/server/actions/sheets"

export function CreateSheetButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleCreate() {
    setLoading(true)
    const result = await createSheet()
    setLoading(false)
    if (result.ok) {
      toast.success("Goal sheet created")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Button onClick={handleCreate} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
      Create Goal Sheet
    </Button>
  )
}
