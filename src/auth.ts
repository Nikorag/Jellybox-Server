import NextAuth, { type NextAuthConfig } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { db } from '@/lib/db'
import { verifySecret } from '@/lib/crypto'
import { authConfig } from './auth.config'
import { getAuthProviderFlags } from '@/lib/auth-flags'


const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const flags = getAuthProviderFlags()

const providers: NextAuthConfig['providers'] = []

if (flags.google) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  )
}

if (flags.oidc.enabled) {
  providers.push({
    id: 'oidc',
    name: flags.oidc.name,
    type: 'oidc',
    issuer: process.env.AUTH_OIDC_ISSUER!,
    clientId: process.env.AUTH_OIDC_ID!,
    clientSecret: process.env.AUTH_OIDC_SECRET!,
    authorization: { params: { scope: 'openid email profile' } },
    checks: ['pkce', 'state'],
  })
}

providers.push(
  Credentials({
    name: 'Credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials)
      if (!parsed.success) return null

      const user = await db.user.findUnique({
        where: { email: parsed.data.email },
      })
      if (!user?.passwordHash) return null

      // Block unverified email/password accounts
      if (!user.emailVerified) return null

      const valid = await verifySecret(parsed.data.password, user.passwordHash)
      if (!valid) return null

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      }
    },
  }),
)

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers,
  events: {
    // Mark email as verified when a user links a federated account
    async linkAccount({ user }) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      })
    },
    // Sync Google profile picture on every sign-in
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && profile?.picture) {
        await db.user.update({
          where: { id: user.id },
          data: { image: profile.picture as string },
        })
      }
    },
  },
})
