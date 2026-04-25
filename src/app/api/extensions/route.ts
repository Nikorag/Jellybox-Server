import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { db } from '@/lib/db'
import { encrypt } from '@/lib/crypto'
import { ExtensionApiError, fetchManifest } from '@/lib/extensions/client'
import { publicExtensionShape, requireSession } from '@/lib/extensions/server'
import type { ExtensionManifest } from '@/lib/extensions/types'

const createSchema = z.object({
  baseUrl: z.string().url('Must be a valid URL'),
})

export async function GET() {
  const user = await requireSession()
  if (user instanceof NextResponse) return user

  const rows = await db.extension.findMany({
    orderBy: { createdAt: 'asc' },
    include: { accounts: { where: { userId: user.id } } },
  })

  return NextResponse.json({
    data: rows.map((r) => publicExtensionShape(r, r.accounts[0] ?? null)),
    isAdmin: user.admin,
  })
}

export async function POST(req: Request) {
  const user = await requireSession()
  if (user instanceof NextResponse) return user
  if (!user.admin) {
    return NextResponse.json({ error: 'Only admins can register extensions.' }, { status: 403 })
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    )
  }

  const baseUrl = parsed.data.baseUrl.replace(/\/$/, '')

  let manifest: ExtensionManifest
  try {
    manifest = await fetchManifest(baseUrl)
  } catch (err) {
    if (err instanceof ExtensionApiError) {
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    return NextResponse.json({ error: 'Failed to fetch manifest.' }, { status: 500 })
  }

  // One shared secret per extension — every Jellybox call to this extension
  // sends it as a bearer token. The admin pastes it into the extension's own
  // config out-of-band so the extension can verify Jellybox is allowed to call.
  const rawSecret = `jbe_${crypto.randomBytes(24).toString('hex')}`

  const created = await db.extension.create({
    data: {
      name: manifest.name,
      baseUrl,
      secret: encrypt(rawSecret),
      manifest: manifest as object,
      addedByUserId: user.id,
    },
  })

  return NextResponse.json({
    data: {
      ...publicExtensionShape(created, null),
      // Returned exactly once at creation. The UI surfaces it to the admin.
      secret: rawSecret,
    },
  })
}
