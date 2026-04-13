'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { verifyEmailAction, resendVerificationAction } from '@/app/auth/actions'

export default function VerifyEmailView() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [status, setStatus] = useState<'idle' | 'verifying' | 'error' | 'resent'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setStatus('verifying')
    verifyEmailAction(token).then((result) => {
      if (result?.error) {
        setError(result.error)
        setStatus('error')
      }
    })
  }, [token])

  async function handleResend() {
    if (!email) return
    await resendVerificationAction(email)
    setStatus('resent')
  }

  if (token && status === 'verifying') {
    return (
      <div className="bg-jf-surface border border-jf-border rounded-xl p-8 shadow-card text-center">
        <div className="w-10 h-10 border-2 border-jf-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-jf-text-secondary text-sm">Verifying your email…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="bg-jf-surface border border-jf-border rounded-xl p-8 shadow-card text-center">
        <div className="w-12 h-12 rounded-full bg-jf-error/10 border border-jf-error/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-jf-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-jf-text-primary mb-2">Verification failed</h2>
        <p className="text-jf-text-secondary text-sm mb-6">{error}</p>
        <Link href="/auth/signin" className="text-jf-primary hover:text-jf-primary-hover text-sm font-medium transition-colors">
          Back to sign in
        </Link>
      </div>
    )
  }

  if (status === 'resent') {
    return (
      <div className="bg-jf-surface border border-jf-border rounded-xl p-8 shadow-card text-center">
        <h2 className="text-xl font-bold text-jf-text-primary mb-2">Email resent</h2>
        <p className="text-jf-text-secondary text-sm">Check your inbox for the new verification link.</p>
      </div>
    )
  }

  // No token — show "check your email" prompt
  return (
    <div className="bg-jf-surface border border-jf-border rounded-xl p-8 shadow-card text-center">
      <div className="w-12 h-12 rounded-full bg-jf-primary-muted border border-jf-primary/30 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-jf-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-jf-text-primary mb-2">Verify your email</h2>
      <p className="text-jf-text-secondary text-sm mb-6">
        We sent a verification link to{' '}
        {email ? <strong className="text-jf-text-primary">{email}</strong> : 'your email address'}.
        Click it to activate your account.
      </p>
      {email && (
        <button
          type="button"
          onClick={handleResend}
          className="text-sm text-jf-primary hover:text-jf-primary-hover font-medium transition-colors"
        >
          Resend verification email
        </button>
      )}
    </div>
  )
}
