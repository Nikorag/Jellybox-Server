import { Suspense } from 'react'
import type { Metadata } from 'next'
import VerifyEmailView from '@/components/auth/VerifyEmailView'

export const metadata: Metadata = {
  title: 'Verify Email — Jellybox Server',
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailView />
    </Suspense>
  )
}
