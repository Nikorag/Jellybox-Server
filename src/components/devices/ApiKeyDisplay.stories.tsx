import type { Meta, StoryObj } from '@storybook/react'
import ApiKeyDisplay from './ApiKeyDisplay'

const meta: Meta<typeof ApiKeyDisplay> = {
  title: 'Devices/ApiKeyDisplay',
  component: ApiKeyDisplay,
  tags: ['autodocs'],
  parameters: { nextjs: { appDirectory: true } },
}
export default meta
type Story = StoryObj<typeof ApiKeyDisplay>

export const Default: Story = {
  args: {
    rawKey: 'jb_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    deviceId: 'device-1',
  },
}
