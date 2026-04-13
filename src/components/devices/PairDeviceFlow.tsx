'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PageHeader, Button, Input, Card, CardContent } from '@/components/ui'
import ApiKeyDisplay from './ApiKeyDisplay'
import { createDeviceAction } from '@/app/dashboard/devices/actions'

type Step = 'name' | 'key'

export default function PairDeviceFlow() {
  const [step, setStep] = useState<Step>('name')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [result, setResult] = useState<{ rawKey: string; deviceId: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const res = await createDeviceAction(formData)
    setIsPending(false)

    if (res.error) {
      setError(res.error)
      return
    }

    if (!res.rawKey || !res.deviceId) return
    setResult({ rawKey: res.rawKey, deviceId: res.deviceId })
    setStep('key')
  }

  if (step === 'key' && result) {
    return (
      <div>
        <PageHeader title="Device API Key" description="Enter this key into your device firmware." />
        <ApiKeyDisplay rawKey={result.rawKey} deviceId={result.deviceId} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Pair New Device"
        description="Give your Jellybox a name, then copy the generated API key into it."
      />

      <Card className="max-w-md">
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-jf-error/10 border border-jf-error/30 text-jf-error text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              name="name"
              label="Device name"
              placeholder="e.g. Living Room Box"
              helperText="A friendly label to identify this device in your dashboard."
              required
            />
            <div className="flex gap-2">
              <Link href="/dashboard/devices">
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
              <Button type="submit" loading={isPending}>
                Generate API Key
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
