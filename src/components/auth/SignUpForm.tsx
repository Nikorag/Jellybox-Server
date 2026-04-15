'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { signUpAction, type SignUpFormState } from '@/app/auth/actions'

const initialState: SignUpFormState = {}

export default function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpAction, initialState)

  async function handleGoogleSignIn() {
    await signIn('google', { callbackUrl: '/dashboard' })
  }

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

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-jf-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-jf-surface px-2 text-jf-text-muted">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="w-full py-2.5 px-4 rounded-lg border border-jf-border bg-jf-elevated hover:bg-jf-overlay text-jf-text-primary font-medium text-sm transition-colors flex items-center justify-center gap-2"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <p className="mt-6 text-center text-sm text-jf-text-muted">
        Already have an account?{' '}
        <Link href="/auth/signin" className="text-jf-primary hover:text-jf-primary-hover font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
