import type { Meta, StoryObj } from '@storybook/react'
import JellyfinConnectForm from './JellyfinConnectForm'

const meta: Meta<typeof JellyfinConnectForm> = {
  title: 'Jellyfin/JellyfinConnectForm',
  component: JellyfinConnectForm,
  tags: ['autodocs'],
  parameters: { nextjs: { appDirectory: true } },
}
export default meta
type Story = StoryObj<typeof JellyfinConnectForm>

export const Default: Story = {}
