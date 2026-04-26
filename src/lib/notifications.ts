import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import type { NotificationChannel } from '@prisma/client'

type NtfyConfig = { url: string; token?: string }
type DiscordConfig = { webhookUrl: string }
type SlackConfig = { webhookUrl: string }

type TagScannedContext = {
  event: 'TAG_SCANNED'
  deviceName: string
  contentTitle: string
}

type PlaybackFailedContext = {
  event: 'PLAYBACK_FAILED'
  deviceName: string
  errorCode: string
}

export type NotificationContext = TagScannedContext | PlaybackFailedContext

export async function fireNotifications(
  userId: string,
  ctx: NotificationContext,
  preloaded?: NotificationChannel[],
): Promise<void> {
  const channels = preloaded ?? await db.notificationChannel.findMany({
    where: { userId, enabled: true, events: { has: ctx.event } },
  })
  if (channels.length === 0) return

  await Promise.allSettled(
    channels.map(async (channel) => {
      let config: unknown
      try {
        config = JSON.parse(decrypt(channel.config))
      } catch {
        return
      }
      switch (channel.type) {
        case 'NTFY':    return sendNtfy(config as NtfyConfig, ctx)
        case 'DISCORD': return sendDiscord(config as DiscordConfig, ctx)
        case 'SLACK':   return sendSlack(config as SlackConfig, ctx)
      }
    }),
  )
}

async function sendNtfy(config: NtfyConfig, ctx: NotificationContext): Promise<void> {
  const headers: Record<string, string> = {
    Title: ctx.event === 'TAG_SCANNED' ? 'Now Playing' : 'Playback Failed',
    Message: ctx.event === 'TAG_SCANNED'
      ? `${ctx.contentTitle} on ${ctx.deviceName}`
      : `Error on ${ctx.deviceName}: ${ctx.errorCode}`,
    Priority: ctx.event === 'TAG_SCANNED' ? '3' : '4',
    Tags: ctx.event === 'TAG_SCANNED' ? 'headphones' : 'warning',
  }
  if (config.token) headers['Authorization'] = `Bearer ${config.token}`
  await fetch(config.url, { method: 'POST', headers, signal: AbortSignal.timeout(5_000) }).catch(() => null)
}

async function sendDiscord(config: DiscordConfig, ctx: NotificationContext): Promise<void> {
  const embed =
    ctx.event === 'TAG_SCANNED'
      ? { title: 'Now Playing', description: `**${ctx.contentTitle}** playing on ${ctx.deviceName}`, color: 0x00c896 }
      : { title: 'Playback Failed', description: `Could not play on **${ctx.deviceName}**: \`${ctx.errorCode}\``, color: 0xe53e3e }

  await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [{ ...embed, timestamp: new Date().toISOString() }] }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => null)
}

async function sendSlack(config: SlackConfig, ctx: NotificationContext): Promise<void> {
  const text =
    ctx.event === 'TAG_SCANNED'
      ? `▶️ *Now Playing* — ${ctx.contentTitle} on ${ctx.deviceName}`
      : `⚠️ *Playback Failed* on ${ctx.deviceName}: ${ctx.errorCode}`

  await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => null)
}
