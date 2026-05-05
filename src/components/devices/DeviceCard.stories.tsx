import type { Meta, StoryObj } from '@storybook/react'
import DeviceCard from './DeviceCard'

const meta: Meta<typeof DeviceCard> = {
  title: 'Devices/DeviceCard',
  component: DeviceCard,
  tags: ['autodocs'],
  parameters: { nextjs: { appDirectory: true } },
}
export default meta
type Story = StoryObj<typeof DeviceCard>

export const WithClient: Story = {
  args: {
    device: {
      lastPlayedAt: new Date(),
      id: 'device-1',
      userId: 'user-1',
      name: 'Living Room Box',
      apiKeyHash: 'hash',
      apiKeyPrefix: 'jb_abc123',
      defaultClientId: 'client-1',
      lastSeenAt: new Date(),
      firmwareVersion: '1.2.0',
      firmwareUpdatePending: false,
      scanModeToken: null,
      scanModeExpiresAt: null,
      pendingScanTagId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      defaultClient: {
        id: 'client-1',
        userId: 'user-1',
        jellyfinServerId: 'server-1',
        jellyfinDeviceId: 'jf-device-1',
        deviceName: 'Living Room TV',
        lastSeenAt: new Date(),
        createdAt: new Date(),
      },
    },
  },
}

export const NoClient: Story = {
  args: {
    device: {
      lastPlayedAt: new Date(),
      id: 'device-2',
      userId: 'user-1',
      name: 'Kids Bedroom Box',
      apiKeyHash: 'hash',
      apiKeyPrefix: 'jb_xyz789',
      defaultClientId: null,
      lastSeenAt: null,
      firmwareVersion: null,
      firmwareUpdatePending: false,
      scanModeToken: null,
      scanModeExpiresAt: null,
      pendingScanTagId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      defaultClient: null,
    },
  },
}
