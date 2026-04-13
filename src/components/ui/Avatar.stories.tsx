import type { Meta, StoryObj } from '@storybook/react'
import Avatar from './Avatar'

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: { size: { control: 'select', options: ['sm', 'md', 'lg'] } },
}
export default meta
type Story = StoryObj<typeof Avatar>

export const WithInitials: Story = { args: { name: 'Jamie Bartlett', size: 'md' } }
export const SingleName: Story = { args: { name: 'Moana', size: 'md' } }
export const Unknown: Story = { args: { name: null, size: 'md' } }
export const Large: Story = { args: { name: 'Jamie Bartlett', size: 'lg' } }
