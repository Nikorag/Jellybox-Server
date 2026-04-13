import type { Metadata } from 'next'
import SignUpForm from '@/components/auth/SignUpForm'

export const metadata: Metadata = {
  title: 'Create Account — Jellybox Server',
}

export default function SignUpPage() {
  return <SignUpForm />
}
