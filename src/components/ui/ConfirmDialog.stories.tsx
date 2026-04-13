'use client'

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import ConfirmDialog from './ConfirmDialog'
import Button from './Button'

const meta: Meta<typeof ConfirmDialog> = {
  title: 'UI/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof ConfirmDialog>

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button variant="destructive" onClick={() => setOpen(true)}>Remove Device</Button>
        <ConfirmDialog
          open={open}
          onClose={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          title="Remove device"
          description="This will permanently remove this device and revoke its API key. This action cannot be undone."
          confirmLabel="Remove device"
        />
      </>
    )
  },
}
