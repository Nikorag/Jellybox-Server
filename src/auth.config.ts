import type { NextAuthConfig } from 'next-auth'

/**
 * Edge-compatible auth config — no Node.js modules (no Prisma, no bcrypt, no crypto).
 * Imported by proxy.ts (middleware) so it runs in the Edge Runtime.
 * Full auth config (with adapter + providers) lives in auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  session: { strategy: 'jwt' as const },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
} satisfies NextAuthConfig
