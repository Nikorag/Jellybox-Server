import type { Meta, StoryObj } from '@storybook/react'
import RecentActivityFeed from './RecentActivityFeed'

const meta: Meta<typeof RecentActivityFeed> = {
  title: 'Dashboard/RecentActivityFeed',
  component: RecentActivityFeed,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof RecentActivityFeed>

const now = new Date()
const minute = (n: number) => new Date(now.getTime() - n * 60000)

export const WithActivity: Story = {
  args: {
    logs: [
      { id: '1', userId: 'u1', deviceId: 'd1', rfidTagId: 't1', deviceName: 'Living Room Box', tagId: 'A1B2C3D4', jellyfinItemTitle: 'The Silver Paw', success: true, errorCode: null, createdAt: minute(2), device: { name: 'Living Room Box' } },
      { id: '2', userId: 'u1', deviceId: 'd1', rfidTagId: 't2', deviceName: 'Living Room Box', tagId: 'E5F6G7H8', jellyfinItemTitle: 'Deep Blue Adventure', success: true, errorCode: null, createdAt: minute(15), device: { name: 'Living Room Box' } },
      { id: '3', userId: 'u1', deviceId: 'd2', rfidTagId: null, deviceName: 'Kids Bedroom Box', tagId: 'I9J0K1L2', jellyfinItemTitle: null, success: false, errorCode: 'UNASSIGNED', createdAt: minute(42), device: { name: 'Kids Bedroom Box' } },
    ],
  },
}

export const Empty: Story = {
  args: { logs: [] },
}
