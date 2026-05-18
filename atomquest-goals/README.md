# AtomQuest Goals — In-House Goal Setting & Tracking Portal

> AtomQuest Hackathon 1.0 submission · Full-stack goal management system with quarterly check-ins, manager approvals, UoM-aware scoring, and analytics.

---

## Elevator Pitch (60 seconds)

AtomQuest Goals is a production-ready employee goal management portal that lets employees set goals across strategic thrust areas, managers approve and provide quarterly feedback, and leaders monitor performance trends — all in a single, beautifully designed web application. Built with the modern full-stack Next.js App Router pattern, every action is fully audited, every state transition is enforced, and the entire codebase ships clean with zero TypeScript errors.

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `raj.admin@atomquest.demo` | `Demo@123` |
| **Manager** | `arjun.manager@atomquest.demo` | `Demo@123` |
| **Manager** | `meera.manager@atomquest.demo` | `Demo@123` |
| **Employee** | `priya.employee@atomquest.demo` | `Demo@123` |
| **Employee** | `vikram.employee@atomquest.demo` | `Demo@123` |
| **Employee** | `ananya.employee@atomquest.demo` | `Demo@123` |
| **Employee** | `rohit.employee@atomquest.demo` | `Demo@123` |
| **Employee** | `sneha.employee@atomquest.demo` | `Demo@123` |
| **Employee** | `karthik.employee@atomquest.demo` | `Demo@123` |

---

## Local Setup (3 commands)

```bash
# 1. Clone and install
pnpm install

# 2. Configure environment — fill in your Neon DATABASE_URL and AUTH_SECRET
cp .env.example .env.local
# Edit .env.local with your values

# 3. Push schema, seed data, start dev server
npx prisma db push && pnpm db:seed && pnpm dev
```

Open `http://localhost:3000` — use "Sign in with Microsoft" and pick any demo user.

---

## Architecture Overview

```
Browser
  └─> Vercel Edge (Next.js 16 App Router)
        ├─ Server Components (data fetch, auth)
        ├─ Server Actions (mutations, validation, audit)
        └─> Prisma 7 (pg adapter) ──> Neon PostgreSQL

Auth Layer
  └─ NextAuth v5 (Credentials provider — mock SSO)
  └─ [ SSO INTEGRATION POINT → swap to @auth/azure-ad ]

Audit Subsystem
  └─ Every mutation writes AuditLog entry
  └─ Admin audit trail with diff viewer

CSV Export
  └─ GET /api/export/achievements → streamed CSV
```

**Cost at scale:**
- Vercel free tier: up to 100 GB-hours/month
- Neon free tier: 0.5 GB storage, auto-suspend
- At 1,000 MAU: ~$0/month (within free tiers)
- At 10,000 MAU: ~$19/month Neon + ~$20/month Vercel Pro = **~$39/month total**

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui (new-york style, hand-implemented) |
| Database | PostgreSQL on Neon |
| ORM | Prisma 7 (pg driver adapter) |
| Auth | NextAuth.js v5 with Credentials + mock SSO |
| Forms | react-hook-form + Zod v4 |
| Charts | Recharts |
| Tables | Tanstack Table v8 |
| Icons | Lucide React |
| Dates | date-fns |
| Toasts | Sonner |

---

## What's Implemented

| BRD Section | Feature | Status |
|---|---|---|
| 2.1 | Goal sheet CRUD (1–8 goals, weightage validation) | ✅ |
| 2.1 | UoM types: NUMERIC_MIN/MAX, PERCENT_MIN/MAX, TIMELINE, ZERO | ✅ |
| 2.1 | Weightage sum enforcement (exactly 100%) with live WeightageBar | ✅ |
| 2.2 | DRAFT → SUBMITTED → APPROVED state machine | ✅ |
| 2.2 | Manager approve / return with reason | ✅ |
| 2.2 | Admin unlock with reason (fully audited) | ✅ |
| 2.3 | Quarterly check-in entry with UoM-aware scoring engine | ✅ |
| 2.3 | Manager team check-in view with per-quarter comments | ✅ |
| 2.3 | Window enforcement (open/close dates per quarter) | ✅ |
| 3.1 | Admin user CRUD with manager mapping | ✅ |
| 3.2 | Goal cycle CRUD with all date windows | ✅ |
| 3.3 | Thrust area CRUD | ✅ |
| 3.4 | Full audit trail with diff viewer | ✅ |
| 3.5 | CSV export (achievements) | ✅ |
| Bonus | Analytics: QoQ trends, thrust area distribution, manager heatmap | ✅ |
| Bonus | Mock SSO "Sign in with Microsoft" with Entra ID integration point | ✅ |
| Bonus | In-app notifications | ✅ |
| Bonus | Demo user switcher in topbar | ✅ |
| Future | Teams bot integration | ❌ (scoped out — see roadmap) |
| Future | Real email notifications (SMTP) | ❌ (in-app only; SMTP is a 20-line addition) |
| Future | Rule-based escalation engine | ❌ (scoped out) |
| Future | Automated tests | ❌ (out of scope for hackathon timebox) |

---

## Production-Ready for Microsoft Entra ID SSO

The login page shows a "Sign in with Microsoft" button that uses a mock Credentials provider for demo purposes. Swapping to real Azure AD requires approximately 50 lines of change:

**In `src/lib/auth.ts`**, replace:
```typescript
// SSO INTEGRATION POINT — replace mock provider with @auth/azure-ad here
Credentials({ ... })
```

With:
```typescript
import AzureAD from "next-auth/providers/azure-ad"
AzureAD({
  clientId: process.env.AZURE_CLIENT_ID!,
  clientSecret: process.env.AZURE_CLIENT_SECRET!,
  tenantId: process.env.AZURE_TENANT_ID!,
})
```

**Add to `.env.local`:**
```
AZURE_CLIENT_ID="..."
AZURE_CLIENT_SECRET="..."
AZURE_TENANT_ID="..."
```

The JWT session contract (`id`, `role`, `managerId`, `department`) stays identical — no other code changes needed.

---

## UoM Scoring Engine

The scoring engine (`src/lib/scoring.ts`) implements:

| UoM Type | Formula | Cap |
|---|---|---|
| `NUMERIC_MIN` / `PERCENT_MIN` | `actual / target` (higher is better) | 1.5× |
| `NUMERIC_MAX` / `PERCENT_MAX` | `target / actual` (lower is better) | 1.5× |
| `TIMELINE` | `1.0` if on time, `0.0` if late | — |
| `ZERO` | `1.0` if zero incidents, `0.0` otherwise | — |

Weighted sheet score = `Σ(score × weightage / 100)` across all goals with an achievement.

---

## Roadmap (Scoped Out)

- **Teams bot** — adaptive cards for approval notifications in Microsoft Teams
- **Real email** — SendGrid/Resend integration (SMTP config is a 20-line addition)
- **Escalation engine** — automatic reminders when check-in windows close without entries
- **Automated tests** — Vitest unit tests for scoring engine; Playwright e2e for demo path
- **Performance budget** — Lighthouse CI gate in GitHub Actions
