'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUpAction, type SignUpFormState } from '@/app/auth/actions'

const initialState: SignUpFormState = {}

export default function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpAction, initialState)

  if (state.success) {
    return (
      <div className="bg-jf-surface border border-jf-border rounded-xl p-8 shadow-card text-center">
        <div className="w-12 h-12 rounded-full bg-jf-success/10 border border-jf-success/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-jf-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-jf-text-primary mb-2">Check your email</h2>
        <p className="text-jf-text-secondary text-sm">
          We&apos;ve sent a verification link to your email address. Click it to activate your account.
        </p>
        <Link
          href="/auth/signin"
          className="mt-6 inline-block text-jf-primary hover:text-jf-primary-hover text-sm font-medium transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-jf-surface border border-jf-border rounded-xl p-8 shadow-card">
      <h1 className="text-2xl font-bold text-jf-text-primary mb-2">Create account</h1>
      <p className="text-jf-text-secondary text-sm mb-6">Start managing your Jellybox devices</p>

      {state.error && (
        <div className="mb-4 p-3 rounded-lg bg-jf-error/10 border border-jf-error/30 text-jf-error text-sm">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-jf-text-secondary mb-1.5">
            Display name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className="form-input w-full rounded-lg bg-jf-elevated border-jf-border text-jf-text-primary placeholder:text-jf-text-muted focus:border-jf-primary focus:ring-jf-primary/30 text-sm"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-jf-text-secondary mb-1.5">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="form-input w-full rounded-lg bg-jf-elevated border-jf-border text-jf-text-primary placeholder:text-jf-text-muted focus:border-jf-primary focus:ring-jf-primary/30 text-sm"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-jf-text-secondary mb-1.5">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="form-input w-full rounded-lg bg-jf-elevated border-jf-border text-jf-text-primary placeholder:text-jf-text-muted focus:border-jf-primary focus:ring-jf-primary/30 text-sm"
            placeholder="At least 8 characters"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 rounded-lg bg-jf-primary hover:bg-jf-primary-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
        >
          {isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-jf-text-muted">
        Already have an account?{' '}
        <Link href="/auth/signin" className="text-jf-primary hover:text-jf-primary-hover font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
