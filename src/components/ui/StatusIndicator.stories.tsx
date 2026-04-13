import type { Meta, StoryObj } from '@storybook/react'
import StatusIndicator from './StatusIndicator'

const meta: Meta<typeof StatusIndicator> = {
  title: 'UI/StatusIndicator',
  component: StatusIndicator,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof StatusIndicator>

export const Connected: Story = { args: { status: 'success', label: 'Connected' } }
export const Unreachable: Story = { args: { status: 'warning', label: 'Unreachable' } }
export const AuthError: Story = { args: { status: 'error', label: 'Auth Error' } }
export const Unknown: Story = { args: { status: 'neutral', label: 'Unknown' } }
