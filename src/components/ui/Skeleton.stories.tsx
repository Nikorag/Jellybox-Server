import type { Meta, StoryObj } from '@storybook/react'
import Skeleton, { TagCardSkeleton, DeviceCardSkeleton } from './Skeleton'

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof Skeleton>

export const Text: Story = { render: () => <Skeleton className="h-4 w-48" /> }
export const TagCard: Story = { render: () => <div style={{ width: 240 }}><TagCardSkeleton /></div> }
export const DeviceCard: Story = { render: () => <div style={{ width: 320 }}><DeviceCardSkeleton /></div> }
