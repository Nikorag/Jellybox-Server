'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { signIn } from '@/auth'
import { db } from '@/lib/db'
import { hashSecret, generateSecureToken } from '@/lib/crypto'
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email'
import {
  PASSWORD_MIN_LENGTH,
  VERIFICATION_TOKEN_EXPIRY_HOURS,
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS,
} from '@/lib/constants'
import { AuthError } from 'next-auth'

// ─── Sign Up ─────────────────────────────────────────────────────────────────

const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
})

export type SignUpFormState = {
  error?: string
  success?: boolean
}

export async function signUpAction(
  _prev: SignUpFormState,
  formData: FormData,
): Promise<SignUpFormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  const { name, email, password } = parsed.data

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return { error: 'An account with that email already exists.' }
  }

  const passwordHash = await hashSecret(password)
  const user = await db.user.create({
    data: { name, email, passwordHash },
  })

  // Generate and store verification token
  const token = generateSecureToken()
  const expires = new Date()
  expires.setHours(expires.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS)

  await db.verificationToken.create({
    data: { identifier: email, token, expires },
  })

  await sendVerificationEmail(email, token)

  // Log the user ID to avoid unused variable lint error
  void user.id

  return { success: true }
}

// ─── Email Verification ───────────────────────────────────────────────────────

export async function verifyEmailAction(token: string): Promise<{ error?: string }> {
  const record = await db.verificationToken.findFirst({
    where: { token },
  })

  if (!record) return { error: 'Invalid or expired verification link.' }
  if (record.expires < new Date()) {
    await db.verificationToken.delete({
      where: { identifier_token: { identifier: record.identifier, token } },
    })
    return { error: 'This verification link has expired. Please request a new one.' }
  }

  await db.user.update({
    where: { email: record.identifier },
    data: { emailVerified: new Date() },
  })

  await db.verificationToken.delete({
    where: { identifier_token: { identifier: record.identifier, token } },
  })

  redirect('/auth/signin?verified=1')
}

// ─── Resend Verification ──────────────────────────────────────────────────────

export async function resendVerificationAction(
  email: string,
): Promise<{ error?: string; success?: boolean }> {
  const user = await db.user.findUnique({ where: { email } })
  if (!user || user.emailVerified) {
    // Return success even if user not found (prevent email enumeration)
    return { success: true }
  }

  // Delete any existing tokens for this identifier
  await db.verificationToken.deleteMany({ where: { identifier: email } })

  const token = generateSecureToken()
  const expires = new Date()
  expires.setHours(expires.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS)

  await db.verificationToken.create({
    data: { identifier: email, token, expires },
  })

  await sendVerificationEmail(email, token)
  return { success: true }
}

// ─── Credentials Sign In ──────────────────────────────────────────────────────

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type SignInFormState = {
  error?: string
}

export async function signInAction(
  _prev: SignInFormState,
  formData: FormData,
): Promise<SignInFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/dashboard',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid email or password.' }
        default:
          return { error: 'Something went wrong. Please try again.' }
      }
    }
    // NextAuth throws a redirect — re-throw it so Next.js handles it
    throw error
  }

  return {}
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export async function forgotPasswordAction(
  email: string,
): Promise<{ error?: string; success?: boolean }> {
  const user = await db.user.findUnique({ where: { email } })
  // Always return success to prevent email enumeration
  if (!user?.passwordHash) return { success: true }

  await db.verificationToken.deleteMany({ where: { identifier: `reset:${email}` } })

  const token = generateSecureToken()
  const expires = new Date()
  expires.setHours(expires.getHours() + PASSWORD_RESET_TOKEN_EXPIRY_HOURS)

  await db.verificationToken.create({
    data: { identifier: `reset:${email}`, token, expires },
  })

  await sendPasswordResetEmail(email, token)
  return { success: true }
}

// ─── Reset Password ───────────────────────────────────────────────────────────

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
})

export async function resetPasswordAction(
  token: string,
  password: string,
): Promise<{ error?: string; success?: boolean }> {
  const parsed = resetPasswordSchema.safeParse({ token, password })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  const record = await db.verificationToken.findFirst({
    where: { token, identifier: { startsWith: 'reset:' } },
  })

  if (!record) return { error: 'Invalid or expired reset link.' }
  if (record.expires < new Date()) {
    await db.verificationToken.delete({
      where: { identifier_token: { identifier: record.identifier, token } },
    })
    return { error: 'This reset link has expired. Please request a new one.' }
  }

  const email = record.identifier.replace('reset:', '')
  const passwordHash = await hashSecret(password)

  await db.user.update({
    where: { email },
    data: { passwordHash },
  })

  await db.verificationToken.delete({
    where: { identifier_token: { identifier: record.identifier, token } },
  })

  return { success: true }
}
