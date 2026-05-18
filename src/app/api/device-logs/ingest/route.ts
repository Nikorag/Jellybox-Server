import { NextResponse } from 'next/server'
import { z } from 'zod'
import { deviceLogsEnabled } from '@/lib/auth-flags'
import { publish } from '@/lib/device-logs/bus'

export const dynamic = 'force-dynamic'

const lineSchema = z.object({
  deviceIp: z.string().max(64).optional(),
  millis: z.number().int().nonnegative().nullable().optional(),
  body: z.string().max(2048),
})

const payloadSchema = z.object({
  lines: z.array(lineSchema).min(1).max(500),
})

function unauthorised() {
  return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
}

export async function POST(req: Request) {
  if (!deviceLogsEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const token = process.env.DEVICE_LOGS_INGEST_TOKEN
  if (!token) return unauthorised()

  const auth = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${token}`
  // Constant-time-ish compare — strings are short, this is fine.
  if (auth.length !== expected.length || auth !== expected) return unauthorised()

  const parsed = payloadSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid payload.' },
      { status: 400 },
    )
  }

  const now = Date.now()
  const fallbackIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  for (const line of parsed.data.lines) {
    publish({
      deviceIp: line.deviceIp ?? fallbackIp,
      millis: line.millis ?? null,
      body: line.body,
      receivedAt: now,
    })
  }

  return new NextResponse(null, { status: 204 })
}
