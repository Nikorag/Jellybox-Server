import type { Meta, StoryObj } from '@storybook/react'
import Badge from './Badge'

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['success', 'warning', 'error', 'info', 'neutral', 'primary'],
    },
  },
}
export default meta
type Story = StoryObj<typeof Badge>

export const Success: Story = { args: { variant: 'success', children: 'Connected' } }
export const Warning: Story = { args: { variant: 'warning', children: 'Unreachable' } }
export const Error: Story = { args: { variant: 'error', children: 'Auth Error' } }
export const Info: Story = { args: { variant: 'info', children: 'In Progress' } }
export const Neutral: Story = { args: { variant: 'neutral', children: 'Unknown' } }
export const Primary: Story = { args: { variant: 'primary', children: 'MOVIE' } }
