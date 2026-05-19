/**
 * Canonical Jellybox SKU (hardware variant) registry.
 *
 * Each device reports its SKU on bootstrap so the server can offer the
 * right firmware build, and the install page lets users pick a SKU before
 * flashing a blank device. Add new variants by appending to SKUS.
 */

export type SkuId = 'jb-eink-v1'

export type Sku = {
  id: SkuId
  displayName: string
  shortName: string
  description: string
  chipFamily: 'ESP32'
}

export const SKUS: readonly Sku[] = [
  {
    id: 'jb-eink-v1',
    displayName: 'Jellybox Classic (eInk)',
    shortName: 'eInk',
    description: '2.9" Waveshare eInk display with a 16-pixel NeoPixel ring.',
    chipFamily: 'ESP32',
  },
] as const

export const DEFAULT_SKU: SkuId = 'jb-eink-v1'

export function isKnownSku(value: string): value is SkuId {
  return SKUS.some((sku) => sku.id === value)
}

export function getSku(id: SkuId): Sku
export function getSku(id: string): Sku | undefined
export function getSku(id: string): Sku | undefined {
  return SKUS.find((sku) => sku.id === id)
}
