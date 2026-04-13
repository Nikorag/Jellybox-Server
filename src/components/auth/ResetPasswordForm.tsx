'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { resetPasswordAction } from '@/app/auth/actions'
import { PASSWORD_MIN_LENGTH } from '@/lib/constants'

export default function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    setError(null)
    const result = await resetPasswordAction(token, password)
    setIsPending(false)
    if (result.error) {
      setError(result.error)
    } else {
      router.push('/auth/signin?reset=1')
    }
  }

  if (!token) {
    return (
      <div className="bg-jf-surface border border-jf-border rounded-xl p-8 shadow-card text-center">
        <p className="text-jf-error text-sm">Invalid reset link. Please request a new one.</p>
        <Link href="/auth/forgot-password" className="mt-4 inline-block text-jf-primary hover:text-jf-primary-hover text-sm font-medium transition-colors">
          Request reset link
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-jf-surface border border-jf-border rounded-xl p-8 shadow-card">
      <h1 className="text-2xl font-bold text-jf-text-primary mb-2">Set new password</h1>
      <p className="text-jf-text-secondary text-sm mb-6">
        Choose a strong password of at least {PASSWORD_MIN_LENGTH} characters.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-jf-error/10 border border-jf-error/30 text-jf-error text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-jf-text-secondary mb-1.5">
            New password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            className="form-input w-full rounded-lg bg-jf-elevated border-jf-border text-jf-text-primary placeholder:text-jf-text-muted focus:border-jf-primary focus:ring-jf-primary/30 text-sm"
            placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 rounded-lg bg-jf-primary hover:bg-jf-primary-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
        >
          {isPending ? 'Saving…' : 'Set new password'}
        </button>
      </form>
    </div>
  )
}
