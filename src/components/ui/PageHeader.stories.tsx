import type { Meta, StoryObj } from '@storybook/react'
import PageHeader from './PageHeader'
import Button from './Button'

const meta: Meta<typeof PageHeader> = {
  title: 'UI/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof PageHeader>

export const TitleOnly: Story = {
  args: { title: 'Devices' },
}

export const WithDescription: Story = {
  args: {
    title: 'RFID Tags',
    description: 'Assign your physical RFID tags to Jellyfin content.',
  },
}

export const WithAction: Story = {
  render: () => (
    <PageHeader
      title="Devices"
      description="Manage your paired Jellybox devices."
      action={<Button size="sm">Pair Device</Button>}
    />
  ),
}
