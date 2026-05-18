import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "./db"
import { loginSchema } from "./validations"
import type { Role } from "@prisma/client"

declare module "next-auth" {
  interface User {
    id: string
    role: Role
    managerId?: string | null
    department?: string | null
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
      managerId?: string | null
      department?: string | null
    }
  }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  providers: [
    // SSO INTEGRATION POINT — replace mock provider with @auth/azure-ad here
    // import AzureAD from "next-auth/providers/azure-ad"
    // AzureAD({ clientId: env.AZURE_CLIENT_ID, clientSecret: env.AZURE_CLIENT_SECRET, tenantId: env.AZURE_TENANT_ID })
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user) return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          managerId: user.managerId,
          department: user.department,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: Role }).role
        token.managerId = (user as { managerId?: string | null }).managerId
        token.department = (user as { department?: string | null }).department
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.managerId = token.managerId as string | null
        session.user.department = token.department as string | null
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
})
