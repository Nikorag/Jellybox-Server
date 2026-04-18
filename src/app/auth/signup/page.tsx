import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import SignUpForm from '@/components/auth/SignUpForm'
import { getAuthProviderFlags } from '@/lib/auth-flags'

export const metadata: Metadata = {
  title: 'Create Account — Jellybox',
}

export default function SignUpPage() {
  const flags = getAuthProviderFlags()
  if (!flags.signupEnabled) {
    redirect('/auth/signin')
  }
  return <SignUpForm flags={flags} />
}
