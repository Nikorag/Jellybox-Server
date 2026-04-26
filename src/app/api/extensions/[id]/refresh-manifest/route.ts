import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ExtensionApiError, fetchManifest } from '@/lib/extensions/client'
import {
  loadExtension,
  loadOwnAccount,
  publicExtensionShape,
  requireSession,
} from '@/lib/extensions/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params
  const user = await requireSession()
  if (user instanceof NextResponse) return user
  if (!user.admin) {
    return NextResponse.json({ error: 'Only admins can refresh manifests.' }, { status: 403 })
  }
  const ext = await loadExtension(id)
  if (ext instanceof NextResponse) return ext

  try {
    const manifest = await fetchManifest(ext.baseUrl)
    const updated = await db.extension.update({
      where: { id },
      data: { name: manifest.name, manifest: manifest as object },
    })
    const own = await loadOwnAccount(id, user.id)
    return NextResponse.json({ data: publicExtensionShape(updated, own) })
  } catch (err) {
    if (err instanceof ExtensionApiError) {
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    return NextResponse.json({ error: 'Failed to refresh manifest.' }, { status: 500 })
  }
}
