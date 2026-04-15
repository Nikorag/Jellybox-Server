import { Suspense } from 'react'
import type { Metadata } from 'next'
import SignInForm from '@/components/auth/SignInForm'

export const metadata: Metadata = {
  title: 'Sign In — Jellybox',
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
