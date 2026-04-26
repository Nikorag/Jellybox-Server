import type { Meta, StoryObj } from '@storybook/react'
import NotificationsSettings from './NotificationsSettings'

const meta: Meta<typeof NotificationsSettings> = {
  title: 'Notifications/NotificationsSettings',
  component: NotificationsSettings,
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<typeof NotificationsSettings>

export const Empty: Story = {
  args: { channels: [] },
}

export const WithChannels: Story = {
  args: {
    channels: [
      {
        id: '1',
        type: 'NTFY',
        label: 'My phone',
        enabled: true,
        events: ['TAG_SCANNED', 'PLAYBACK_FAILED'],
        displayConfig: 'ntfy.sh/my-topic',
      },
      {
        id: '2',
        type: 'DISCORD',
        label: 'Family server',
        enabled: true,
        events: ['PLAYBACK_FAILED'],
        displayConfig: 'discord.com…',
      },
      {
        id: '3',
        type: 'SLACK',
        label: 'Home alerts',
        enabled: false,
        events: ['TAG_SCANNED'],
        displayConfig: 'hooks.slack.com…',
      },
    ],
  },
}
