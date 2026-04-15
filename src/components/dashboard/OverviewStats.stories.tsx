import type { Meta, StoryObj } from '@storybook/react'
import OverviewStats from './OverviewStats'

const meta: Meta<typeof OverviewStats> = {
  title: 'Dashboard/OverviewStats',
  component: OverviewStats,
  tags: ['autodocs'],
  parameters: { nextjs: { appDirectory: true } },
}
export default meta
type Story = StoryObj<typeof OverviewStats>

export const Connected: Story = {
  args: {
    server: {
      id: 'server-1',
      userId: 'user-1',
      serverUrl: 'https://jellyfin.example.com',
      apiToken: 'encrypted',
      customHeaders: null,
      serverId: 'srv-1',
      serverName: 'Home Media Server',
      status: 'CONNECTED',
      lastCheckedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    deviceCount: 2,
    tagCount: 14,
    recentSuccessCount: 7,
  },
}

export const NotLinked: Story = {
  args: {
    server: null,
    deviceCount: 0,
    tagCount: 0,
    recentSuccessCount: 0,
  },
}
