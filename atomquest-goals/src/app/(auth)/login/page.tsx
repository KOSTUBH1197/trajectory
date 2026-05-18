"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Mail, ArrowRight, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { loginSchema, type LoginInput } from "@/lib/validations"
import { cn } from "@/lib/utils"

const DEMO_USERS = [
  { email: "raj.admin@atomquest.demo",    name: "Raj Patel",    role: "Admin",    password: "Demo@123", dept: "Leadership" },
  { email: "arjun.manager@atomquest.demo", name: "Arjun Kapoor", role: "Manager",  password: "Demo@123", dept: "Sales" },
  { email: "meera.manager@atomquest.demo", name: "Meera Iyer",   role: "Manager",  password: "Demo@123", dept: "Engineering" },
  { email: "priya.employee@atomquest.demo",  name: "Priya Sharma",  role: "Employee", password: "Demo@123", dept: "Sales" },
  { email: "vikram.employee@atomquest.demo", name: "Vikram Nair",   role: "Employee", password: "Demo@123", dept: "Sales" },
  { email: "rohit.employee@atomquest.demo",  name: "Rohit Desai",   role: "Employee", password: "Demo@123", dept: "Engineering" },
  { email: "sneha.employee@atomquest.demo",  name: "Sneha Kumar",   role: "Employee", password: "Demo@123", dept: "Engineering" },
  { email: "karthik.employee@atomquest.demo",name: "Karthik Rajan", role: "Employee", password: "Demo@123", dept: "Engineering" },
  { email: "ananya.employee@atomquest.demo", name: "Ananya Singh",  role: "Employee", password: "Demo@123", dept: "Sales" },
]

const ROLE_COLORS: Record<string, string> = {
  Admin: "bg-primary/10 text-primary",
  Manager: "bg-warning/20 text-warning-foreground",
  Employee: "bg-success/15 text-success",
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [ssoOpen, setSsoOpen] = useState(false)
  const [emailFormOpen, setEmailFormOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loggingInAs, setLoggingInAs] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    const demoEmail = searchParams.get("demo")
    if (demoEmail) {
      const user = DEMO_USERS.find((u) => u.email === demoEmail)
      if (user) handleDemoLogin(user.email, user.password, user.name)
    }
  }, [searchParams])

  async function handleDemoLogin(email: string, password: string, name: string) {
    setLoading(true)
    setLoggingInAs(name)
    const result = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    setLoggingInAs(null)
    if (result?.ok) {
      router.push("/dashboard")
      router.refresh()
    } else {
      toast.error("Login failed. Run pnpm db:seed first.")
    }
  }

  async function onEmailSubmit(data: LoginInput) {
    setLoading(true)
    const result = await signIn("credentials", { email: data.email, password: data.password, redirect: false })
    setLoading(false)
    if (result?.ok) {
      router.push("/dashboard")
      router.refresh()
    } else {
      toast.error("Invalid email or password")
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col relative overflow-hidden bg-[oklch(0.10_0_0)]">
        {/* Gradient orbs */}
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />

        <div className="relative z-10 flex flex-col h-full px-12 py-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
              <span className="text-sm font-bold text-white">AQ</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">AtomQuest</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-xs text-white/60 font-medium">AtomQuest Hackathon 1.0</span>
                </div>
                <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
                  Goals that<br />
                  <span className="gradient-text">drive results.</span>
                </h1>
                <p className="text-white/50 text-base leading-relaxed max-w-sm">
                  Set meaningful goals, track quarterly progress, and get actionable insights — all in one place.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  "UoM-aware scoring engine (NUMERIC, %, TIMELINE, ZERO)",
                  "Full lifecycle: Draft → Approved → Tracked",
                  "Manager check-ins with QoQ analytics",
                ].map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <span className="text-sm text-white/60">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-white/25">
            Production-ready · Entra ID SSO integration point included
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-white">AQ</span>
            </div>
            <span className="font-semibold">AtomQuest Goals</span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <div className="space-y-3">
            {/* Microsoft SSO — primary CTA */}
            <button
              onClick={() => setSsoOpen(true)}
              disabled={loading}
              className={cn(
                "group w-full flex items-center justify-center gap-3 rounded-lg border-2 border-border bg-card px-4 py-3",
                "text-sm font-medium text-foreground shadow-sm",
                "transition-all duration-150 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:pointer-events-none disabled:opacity-50"
              )}
            >
              {/* Microsoft logo */}
              <svg width="18" height="18" viewBox="0 0 21 21" fill="none" aria-hidden="true" className="shrink-0">
                <rect x="1"  y="1"  width="9" height="9" fill="#f25022" rx="0.5"/>
                <rect x="11" y="1"  width="9" height="9" fill="#7fba00" rx="0.5"/>
                <rect x="1"  y="11" width="9" height="9" fill="#00a4ef" rx="0.5"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" rx="0.5"/>
              </svg>
              <span>Continue with Microsoft</span>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Email toggle */}
            <button
              onClick={() => setEmailFormOpen(!emailFormOpen)}
              disabled={loading}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5",
                "text-sm text-muted-foreground transition-all hover:text-foreground hover:border-border-strong",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:pointer-events-none disabled:opacity-50"
              )}
            >
              <Mail className="h-4 w-4" />
              Sign in with email
            </button>

            {emailFormOpen && (
              <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@atomquest.demo"
                    className="h-10"
                    {...register("email")}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs text-muted-foreground uppercase tracking-wider">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="h-10"
                    {...register("password")}
                  />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
                <Button type="submit" className="w-full h-10" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign in
                </Button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Demo password: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">Demo@123</code>
          </p>
        </div>
      </div>

      {/* Microsoft SSO modal */}
      <Dialog open={ssoOpen} onOpenChange={setSsoOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="bg-[oklch(0.10_0_0)] px-6 py-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/30">
              <span className="text-sm font-bold text-white">AQ</span>
            </div>
            <div>
              <DialogTitle className="text-white text-base">Microsoft Entra ID</DialogTitle>
              <DialogDescription className="text-white/50 text-xs mt-0.5">
                Mock provider · Production-ready integration point
              </DialogDescription>
            </div>
          </div>

          <div className="px-6 py-4 space-y-4">
            <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5 text-xs text-warning-foreground">
              <strong>Demo mode:</strong> Uses Credentials provider with same JWT contract. Swap to{" "}
              <code className="font-mono">@auth/azure-ad</code> in <code className="font-mono">src/lib/auth.ts</code> — 50 lines, no other changes.
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Select account
              </p>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.email}
                    onClick={() => { setSsoOpen(false); handleDemoLogin(u.email, u.password, u.name) }}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                      "transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      loggingInAs === u.name && "opacity-60 pointer-events-none"
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {u.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.dept}</p>
                    </div>
                    <span className={cn("text-xs font-medium rounded-full px-2 py-0.5", ROLE_COLORS[u.role])}>
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 border-t py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in as {loggingInAs}…
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginContent /></Suspense>
}
