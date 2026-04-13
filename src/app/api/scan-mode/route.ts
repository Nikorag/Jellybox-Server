import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { generateSecureToken } from '@/lib/crypto'

const SCAN_MODE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// POST /api/scan-mode — activate scan capture mode on a device
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const parsed = z.object({ deviceId: z.string() }).safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'deviceId is required.' }, { status: 400 })
    }

    const device = await db.device.findFirst({
      where: { id: parsed.data.deviceId, userId: session.user.id },
    })
    if (!device) {
      return NextResponse.json({ error: 'Device not found.' }, { status: 404 })
    }

    const token = generateSecureToken()
    const expiresAt = new Date(Date.now() + SCAN_MODE_TTL_MS)

    await db.device.update({
      where: { id: device.id },
      data: {
        scanModeToken: token,
        scanModeExpiresAt: expiresAt,
        pendingScanTagId: null,
      },
    })

    return NextResponse.json({ token, expiresAt: expiresAt.toISOString() })
  } catch (err) {
    console.error('[scan-mode POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}

// GET /api/scan-mode?token=<token> — poll for a captured tag ID
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const token = new URL(req.url).searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'token is required.' }, { status: 400 })
    }

    const device = await db.device.findFirst({
      where: { scanModeToken: token, userId: session.user.id },
    })

    if (!device) {
      return NextResponse.json({ status: 'expired' })
    }

    if (device.scanModeExpiresAt && device.scanModeExpiresAt < new Date()) {
      await db.device.update({
        where: { id: device.id },
        data: { scanModeToken: null, scanModeExpiresAt: null, pendingScanTagId: null },
      })
      return NextResponse.json({ status: 'expired' })
    }

    if (device.pendingScanTagId) {
      const tagId = device.pendingScanTagId
      await db.device.update({
        where: { id: device.id },
        data: { scanModeToken: null, scanModeExpiresAt: null, pendingScanTagId: null },
      })
      return NextResponse.json({ status: 'captured', tagId })
    }

    return NextResponse.json({ status: 'pending' })
  } catch (err) {
    console.error('[scan-mode GET]', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}

// DELETE /api/scan-mode?token=<token> — cancel scan mode
export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const token = new URL(req.url).searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'token is required.' }, { status: 400 })
    }

    await db.device.updateMany({
      where: { scanModeToken: token, userId: session.user.id },
      data: { scanModeToken: null, scanModeExpiresAt: null, pendingScanTagId: null },
    })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[scan-mode DELETE]', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
