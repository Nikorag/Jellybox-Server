import type { Metadata } from 'next'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getActiveAccountId } from '@/lib/context'
import { ACTIVITY_LOG_PAGE_SIZE } from '@/lib/constants'
import OverviewStats from '@/components/dashboard/OverviewStats'
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const accountId = await getActiveAccountId(session.user.id)

  const [server, deviceCount, tagCount, recentLogs] = await Promise.all([
    db.jellyfinServer.findUnique({ where: { userId: accountId } }),
    db.device.count({ where: { userId: accountId } }),
    db.rfidTag.count({ where: { userId: accountId } }),
    db.activityLog.findMany({
      where: { userId: accountId },
      orderBy: { createdAt: 'desc' },
      take: ACTIVITY_LOG_PAGE_SIZE,
      include: { device: { select: { name: true } } },
    }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-jf-text-primary">
          Welcome back, {session.user.name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="text-jf-text-secondary mt-1 text-sm">
          Here&apos;s what&apos;s happening with your Jellybox.
        </p>
      </div>

      <OverviewStats
        server={server}
        deviceCount={deviceCount}
        tagCount={tagCount}
        recentSuccessCount={recentLogs.filter((l) => l.success).length}
      />

      <RecentActivityFeed logs={recentLogs} />
    </div>
  )
}
