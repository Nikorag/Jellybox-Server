import type { Metadata } from 'next'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getActiveAccountId } from '@/lib/context'
import { ACTIVITY_LOG_PAGE_SIZE } from '@/lib/constants'
import Avatar from '@/components/ui/Avatar'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const accountId = await getActiveAccountId(session.user.id)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [server, deviceCount, tagCount, recentLogs, weeklyPlays, recentTags, userSettings] =
    await Promise.all([
      db.jellyfinServer.findUnique({ where: { userId: accountId } }),
      db.device.count({ where: { userId: accountId } }),
      db.rfidTag.count({ where: { userId: accountId } }),
      db.activityLog.findMany({
        where: { userId: accountId },
        orderBy: { createdAt: 'desc' },
        take: ACTIVITY_LOG_PAGE_SIZE,
        include: {
          device: { select: { name: true } },
          rfidTag: { select: { jellyfinItemImageTag: true, jellyfinItemId: true } },
        },
      }),
      db.activityLog.count({
        where: { userId: accountId, success: true, createdAt: { gte: weekAgo } },
      }),
      db.rfidTag.findMany({
        where: {
          userId: accountId,
          activityLogs: { some: {} },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          label: true,
          jellyfinItemId: true,
          jellyfinItemImageTag: true,
          jellyfinItemTitle: true,
        },
      }),
      db.user.findUnique({
        where: { id: session.user.id },
        select: {
          operatingHoursEnabled: true,
          operatingHoursStart: true,
          operatingHoursEnd: true,
        },
      }),
    ])

  const firstName = session.user.name?.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="flex items-center gap-4">
        <Avatar name={session.user.name} src={session.user.image} size="lg" />
        <div>
          <h1 className="text-2xl font-bold text-jf-text-primary">
            Welcome back, {firstName}
          </h1>
          <p className="text-jf-text-secondary text-sm mt-0.5">
            Here&apos;s what&apos;s happening with your Jellybox.
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6 items-start">
        {/* Main: activity feed */}
        <div>
          <h2 className="text-base font-semibold text-jf-text-primary mb-3">Recent activity</h2>
          <ActivityFeed logs={recentLogs} />
        </div>

        {/* Sidebar: stats + operating hours + recent tags */}
        <DashboardSidebar
          server={server}
          deviceCount={deviceCount}
          tagCount={tagCount}
          weeklyPlays={weeklyPlays}
          recentTags={recentTags}
          operatingHoursEnabled={userSettings?.operatingHoursEnabled ?? false}
          operatingHoursStart={userSettings?.operatingHoursStart ?? null}
          operatingHoursEnd={userSettings?.operatingHoursEnd ?? null}
        />
      </div>
    </div>
  )
}
