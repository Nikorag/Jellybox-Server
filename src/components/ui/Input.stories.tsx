import type { Meta, StoryObj } from '@storybook/react'
import Input from './Input'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    helperText: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
}
export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: { label: 'Server URL', placeholder: 'https://jellyfin.example.com' },
}

export const WithHelperText: Story = {
  args: {
    label: 'API Key',
    helperText: 'You can find this in Jellyfin → Dashboard → API Keys',
    placeholder: 'Paste your API key…',
  },
}

export const WithError: Story = {
  args: {
    label: 'Server URL',
    error: 'Could not reach this server. Check the URL and try again.',
    defaultValue: 'http://not-a-valid-url',
  },
}

export const Disabled: Story = {
  args: { label: 'Email', defaultValue: 'user@example.com', disabled: true },
}
