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
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id
      }
      // Sync Google avatar into token on every Google sign-in so the
      // sidebar avatar stays current without requiring a DB read per request.
      if (account?.provider === 'google' && profile?.picture) {
        token.picture = profile.picture as string
      }
      return token
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string
      }
      if (token?.picture && session.user) {
        session.user.image = token.picture as string
      }
      return session
    },
  },
} satisfies NextAuthConfig
