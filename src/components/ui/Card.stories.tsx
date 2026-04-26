import type { Meta, StoryObj } from '@storybook/react'
import Card, { CardHeader, CardContent, CardFooter } from './Card'
import Button from './Button'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  render: () => (
    <Card style={{ width: 360 }}>
      <CardContent>
        <p className="text-jf-text-primary">A simple card</p>
      </CardContent>
    </Card>
  ),
}

export const WithHeaderAndFooter: Story = {
  render: () => (
    <Card style={{ width: 360 }}>
      <CardHeader>
        <h3 className="font-semibold text-jf-text-primary">Living Room Box</h3>
        <p className="text-sm text-jf-text-muted">Last seen 2 minutes ago</p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-jf-text-secondary">Firmware v1.2.0 · 12 tags assigned</p>
      </CardContent>
      <CardFooter className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm">Edit</Button>
        <Button variant="destructive" size="sm">Remove</Button>
      </CardFooter>
    </Card>
  ),
}

export const Hoverable: Story = {
  render: () => (
    <Card hoverable style={{ width: 240 }}>
      <CardContent>
        <p className="text-jf-text-primary font-medium">The Silver Paw</p>
        <p className="text-xs text-jf-text-muted mt-1">Tag: A1B2C3D4</p>
      </CardContent>
    </Card>
  ),
}
