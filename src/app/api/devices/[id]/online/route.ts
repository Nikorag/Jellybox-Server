import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

/**
 * GET /api/devices/[id]/online
 *
 * Polled by the pair wizard to detect when a newly configured device
 * has connected and called /api/device/me for the first time.
 * New devices have lastSeenAt = null; the firmware sets it on first bootstrap.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { id } = await params

  const device = await db.device.findFirst({
    where: { id, userId: session.user.id },
    select: { name: true, lastSeenAt: true },
  })

  if (!device) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    online: device.lastSeenAt !== null,
    name: device.name,
  })
}
