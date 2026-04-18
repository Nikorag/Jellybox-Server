import { Suspense } from 'react'
import type { Metadata } from 'next'
import SignInForm from '@/components/auth/SignInForm'
import { getAuthProviderFlags } from '@/lib/auth-flags'

export const metadata: Metadata = {
  title: 'Sign In — Jellybox',
}

export default function SignInPage() {
  const flags = getAuthProviderFlags()
  return (
    <Suspense>
      <SignInForm flags={flags} />
    </Suspense>
  )
}
