'use client'

import { useState } from 'react'
import Link from 'next/link'
import { forgotPasswordAction } from '@/app/auth/actions'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    setError(null)
    const result = await forgotPasswordAction(email)
    setIsPending(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="bg-jf-surface border border-jf-border rounded-xl p-8 shadow-card text-center">
        <h2 className="text-xl font-bold text-jf-text-primary mb-2">Check your email</h2>
        <p className="text-jf-text-secondary text-sm">
          If an account exists for <strong className="text-jf-text-primary">{email}</strong>, we&apos;ve sent a password reset link.
        </p>
        <Link href="/auth/signin" className="mt-6 inline-block text-jf-primary hover:text-jf-primary-hover text-sm font-medium transition-colors">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-jf-surface border border-jf-border rounded-xl p-8 shadow-card">
      <h1 className="text-2xl font-bold text-jf-text-primary mb-2">Forgot password?</h1>
      <p className="text-jf-text-secondary text-sm mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-jf-error/10 border border-jf-error/30 text-jf-error text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-jf-text-secondary mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="form-input w-full rounded-lg bg-jf-elevated border-jf-border text-jf-text-primary placeholder:text-jf-text-muted focus:border-jf-primary focus:ring-jf-primary/30 text-sm"
            placeholder="you@example.com"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 rounded-lg bg-jf-primary hover:bg-jf-primary-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
        >
          {isPending ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-jf-text-muted">
        <Link href="/auth/signin" className="text-jf-primary hover:text-jf-primary-hover font-medium transition-colors">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
