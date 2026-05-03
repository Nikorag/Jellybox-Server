export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startFirmwareManifestPolling } = await import('./src/lib/firmware-manifest')
    startFirmwareManifestPolling()
  }
}
