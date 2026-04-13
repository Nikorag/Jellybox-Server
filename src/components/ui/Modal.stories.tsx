'use client'

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import Modal from './Modal'
import Button from './Button'

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof Modal>

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Modal</Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Pair New Device"
          description="Enter the name for this Jellybox device."
        >
          <p className="text-sm text-jf-text-secondary mb-4">Modal content goes here.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Confirm</Button>
          </div>
        </Modal>
      </>
    )
  },
}
