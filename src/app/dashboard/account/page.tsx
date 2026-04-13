import type { Metadata } from 'next'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import AccountSettings from '@/components/account/AccountSettings'

export const metadata: Metadata = { title: 'Account Settings' }

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  return (
    <div>
      <PageHeader title="Account" description="Manage your profile and account settings." />
      <AccountSettings user={session.user} />
    </div>
  )
}
