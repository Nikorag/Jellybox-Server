import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSku, SKUS, type SkuId } from '@/lib/skus'
import StlModelViewerLoader from '@/components/docs/StlModelViewerLoader'
import LightboxImage from '@/components/docs/LightboxImage'

// ── Per-SKU hardware data ──────────────────────────────────────────────────
// All hardware-page specifics live in this block. To add a SKU: append an
// entry, drop the matching assets under public/, and the page picks it up.

type BomRow = { component: string; notes: string; qty: number | string }
type PinRow = { from: string; to: string; desc: string }
type PinTableData = { title: string; note?: string; rows: PinRow[] }
type Hole = { id: string; x: string; y: string; d: string }

interface HardwareConfig {
  intro: string
  bom: BomRow[]
  pcb: {
    dimensions: string
    holes: Hole[]
    topImage: string
    bottomImage: string
    schematicSvg: string
    stl: string
    gerbersZip: string
    drillMapPdf: string
    tindieUrl: string
    topCaption: string
    bottomCaption: string
  }
  wiring: {
    diagramImage: string
    diagramAlt: string
    diagramCaption: string
    /** Display section (eInk on Classic, TFT on Studio). */
    displayTable: PinTableData
    /** Extra peripheral tables (TFT adds I²S amp + rotary encoder). */
    extraTables?: PinTableData[]
  }
}

const HARDWARE: Record<SkuId, HardwareConfig> = {
  'jb-eink-v1': {
    intro:
      'Everything you need to build a Jellybox device from scratch. The Classic build is intentionally simple: an ESP32, an NFC reader, an eInk screen, and a NeoPixel ring.',
    bom: [
      { component: 'ESP32 dev board', notes: 'Any 38-pin ESP32 DevKit works. The BOOT button (GPIO0) is used for factory reset.', qty: 1 },
      { component: 'PN532 NFC/RFID module', notes: 'Must support I²C mode. Most breakout boards (Elechouse, AZDelivery) include mode-select DIP switches.', qty: 1 },
      { component: 'Waveshare 2.9" V2 B/W eInk display', notes: 'Part number: 2.9inch e-Paper Module (B). 296×128 pixels, SPI interface. Make sure it is V2.', qty: 1 },
      { component: 'NeoPixel 16-LED ring (WS2812B)', notes: 'Any WS2812B 16-LED ring. Unbranded ones from Amazon/AliExpress work fine.', qty: 1 },
      { component: 'LiPo battery + TP4056 charger board', notes: 'A 1000–2000 mAh single-cell LiPo with a TP4056 (micro-USB or USB-C) charging board.', qty: 1 },
      { component: 'SPDT power switch', notes: 'Fitted in line between the TP4056 output and the ESP32 so the device can be turned off completely.', qty: 1 },
      { component: 'Breadboard or perfboard + jumper wires', notes: 'For prototyping.', qty: 1 },
      { component: 'RFID/NFC tags (NTAG213 or NTAG215)', notes: "Standard ISO 14443A tags. CR80 PVC stickers (85.6 × 53.98 mm) pair with the dashboard's sticker sheet designer.", qty: '10+' },
    ],
    pcb: {
      dimensions:
        'The PCB is 77.14 × 33.01 mm, two-layer FR4, 1.6 mm thick. Four 2.0 mm mounting holes (M2 clearance) sit near the corners — positions are measured from the bottom-left corner of the board outline.',
      holes: [
        { id: 'M1 (bottom-left)',  x: '1.27',  y: '1.47',  d: '2.0' },
        { id: 'M2 (bottom-right)', x: '75.70', y: '1.67',  d: '2.0' },
        { id: 'M3 (top-left)',     x: '1.47',  y: '31.65', d: '2.0' },
        { id: 'M4 (top-right)',    x: '75.70', y: '31.55', d: '2.0' },
      ],
      topImage: '/images/pcb/pcb-top-jb-eink-v1.png',
      bottomImage: '/images/pcb/pcb-bottom-jb-eink-v1.png',
      schematicSvg: '/images/pcb/jb-eink-v1.svg',
      stl: '/models/jb-eink-v1.stl',
      gerbersZip: '/downloads/jb-eink-v1-gerbers.zip',
      drillMapPdf: '/downloads/jb-eink-v1-drl_map.pdf',
      tindieUrl: '',
      topCaption: 'Top side — module headers, NFC, eInk, NeoPixel, charger footprints.',
      bottomCaption: 'Bottom side — routing and battery pads.',
    },
    wiring: {
      diagramImage: '/wiring.png',
      diagramAlt: 'Wiring diagram showing the ESP32 connected to the PN532 NFC reader, Waveshare eInk display, and NeoPixel ring.',
      diagramCaption: 'Wiring overview — ESP32 to PN532, eInk display, and NeoPixel ring.',
      displayTable: {
        title: 'Waveshare 2.9″ V2 eInk display (SPI)',
        note: "The display uses the ESP32's default VSPI bus (MOSI=23, CLK=18). Other pins are defined in Config.h.",
        rows: [
          { from: 'VCC', to: '3.3V', desc: '' },
          { from: 'GND', to: 'GND', desc: '' },
          { from: 'DIN (MOSI)', to: 'GPIO 23', desc: 'SPI MOSI — shared VSPI bus' },
          { from: 'CLK (SCK)', to: 'GPIO 18', desc: 'SPI clock — shared VSPI bus' },
          { from: 'CS', to: 'GPIO 5', desc: 'Chip select — active low' },
          { from: 'DC', to: 'GPIO 17', desc: 'Data / command select' },
          { from: 'RST', to: 'GPIO 16', desc: 'Reset' },
          { from: 'BUSY', to: 'GPIO 4', desc: 'Busy signal — wait for LOW before sending commands' },
        ],
      },
    },
  },
  'jb-tft-v1': {
    intro:
      'The Studio build adds a 320×240 colour TFT, an I²S speaker for audio cues, and a rotary encoder for volume. Base ESP32 + PN532 + NeoPixel ring is unchanged from the Classic.',
    bom: [
      { component: 'ESP32 dev board', notes: 'Any 38-pin ESP32 DevKit. BOOT button (GPIO0) used for factory reset.', qty: 1 },
      { component: 'PN532 NFC/RFID module', notes: 'I²C mode. Same as the Classic.', qty: 1 },
      { component: '2.4" ST7789 colour TFT (320×240, SPI)', notes: 'Bare 8-pin module without a touch controller. Verify the pin order against your breakout — vendors vary. BLK/LED stays tied to 3.3 V; no GPIO backlight control in firmware.', qty: 1 },
      { component: 'MAX98357A I²S amplifier breakout', notes: 'Adafruit #3006, AZ-Delivery, or any equivalent 5-pin breakout. Leave GAIN and SD floating for default 9 dB always-on operation.', qty: 1 },
      { component: 'Speaker — 4 Ω or 8 Ω, ≥ 1 W', notes: 'Two leads into the speaker terminal on the PCB. The board routes them back to the amp\'s SPK+/SPK− pads — no flying wires. Pick something small enough to fit your enclosure.', qty: 1 },
      { component: 'KY-040 rotary encoder', notes: '5-pin breakout with onboard pull-ups. ESP32 input-only pins (34/35/39) are used so no external resistors are required.', qty: 1 },
      { component: 'NeoPixel 16-LED ring (WS2812B)', notes: 'Same as the Classic.', qty: 1 },
      { component: 'LiPo battery + TP4056 charger board', notes: 'Same as the Classic — 1000–2000 mAh single-cell LiPo through a TP4056.', qty: 1 },
      { component: 'SPDT power switch', notes: 'In line between TP4056 output and ESP32 VIN.', qty: 1 },
      { component: 'RFID/NFC tags (NTAG213 or NTAG215)', notes: 'Same as the Classic.', qty: '10+' },
    ],
    pcb: {
      dimensions:
        'The Studio PCB carries the same ESP32, PN532, NeoPixel and charger headers as the Classic plus two extra connectors (I²S amp + rotary encoder) and an 8-pin TFT header in place of the eInk one. Exact dimensions and mounting-hole positions are taken from the current KiCad layout — update this entry once the board is finalised.',
      holes: [],
      topImage: '/images/pcb/pcb-top-jb-tft-v1.png',
      bottomImage: '/images/pcb/pcb-bottom-jb-tft-v1.png',
      schematicSvg: '/images/pcb/jb-tft-v1.svg',
      stl: '/models/jb-tft-v1.stl',
      gerbersZip: '/downloads/jb-tft-v1-gerbers.zip',
      drillMapPdf: '/downloads/jb-tft-v1-drl_map.pdf',
      tindieUrl: '',
      topCaption: 'Top side — headers for ESP32, PN532, TFT, NeoPixel, I²S amp, rotary encoder, and charger.',
      bottomCaption: 'Bottom side — routing and battery pads.',
    },
    wiring: {
      diagramImage: '/wiring.png',
      diagramAlt: 'Wiring overview — ESP32 connected to PN532, ST7789 TFT, MAX98357A I²S amp, rotary encoder, and NeoPixel ring.',
      diagramCaption: 'Wiring overview — Studio build. (A dedicated TFT diagram is on the way; this image is the Classic for now.)',
      displayTable: {
        title: '2.4″ ST7789 colour TFT (SPI)',
        note: 'Reuses the same SPI bus (MOSI=23, SCK=18) and chip-select / data-command / reset pins as the Classic eInk. BUSY (GPIO 4) is unused — the BLK / LED backlight pin sits on 3.3 V instead.',
        rows: [
          { from: 'GND', to: 'GND', desc: '' },
          { from: 'VCC', to: '3.3V', desc: 'Module accepts 3.3 V or 5 V — 3.3 V is plenty.' },
          { from: 'SCL (SCK)', to: 'GPIO 18', desc: 'SPI clock — shared VSPI bus' },
          { from: 'SDA (MOSI)', to: 'GPIO 23', desc: 'SPI MOSI — shared VSPI bus' },
          { from: 'RES (RST)', to: 'GPIO 16', desc: 'Reset' },
          { from: 'DC', to: 'GPIO 17', desc: 'Data / command select' },
          { from: 'CS', to: 'GPIO 5', desc: 'Chip select — active low' },
          { from: 'BLK / LED', to: '3.3V', desc: 'Backlight always-on (no PWM control in firmware)' },
        ],
      },
      extraTables: [
        {
          title: 'MAX98357A I²S amplifier',
          note: 'GAIN and SD inputs are left floating — default 9 dB gain, always-on. The amp\'s SPK+ / SPK− output pads are routed through the PCB straight to the speaker terminal, so no flying wires are needed at assembly — solder the amp module into its 7-pin header and the speaker into its 2-pin terminal.',
          rows: [
            { from: 'VIN', to: '5V (VIN)', desc: 'Run the amp off the 5 V rail (TP4056 output) — louder than 3.3 V.' },
            { from: 'GND', to: 'GND', desc: '' },
            { from: 'DIN', to: 'GPIO 32', desc: 'I²S data' },
            { from: 'BCLK', to: 'GPIO 14', desc: 'I²S bit clock' },
            { from: 'LRC', to: 'GPIO 33', desc: 'I²S left/right select (word clock)' },
            { from: 'SPK+', to: 'Speaker terminal +', desc: 'Routed on the PCB to the speaker connector — no wire needed' },
            { from: 'SPK−', to: 'Speaker terminal −', desc: 'Routed on the PCB to the speaker connector — no wire needed' },
          ],
        },
        {
          title: 'Speaker terminal (2-pin)',
          note: 'The two pads on the PCB connect internally to the amp\'s SPK+/SPK− outputs. Polarity matters for stereo phasing but not for a single mono speaker — wire either way.',
          rows: [
            { from: '+', to: 'Amp SPK+', desc: 'PCB trace from the amp output' },
            { from: '−', to: 'Amp SPK−', desc: 'PCB trace from the amp output' },
          ],
        },
        {
          title: 'KY-040 rotary encoder',
          note: 'Encoder breakout has onboard pull-ups on CLK/DT, so the ESP32’s input-only pins (34/35/39) can be used without external resistors.',
          rows: [
            { from: 'GND', to: 'GND', desc: '' },
            { from: '+', to: '3.3V', desc: '' },
            { from: 'SW', to: 'GPIO 39', desc: 'Push-button — reserved; not used in v1 firmware' },
            { from: 'DT', to: 'GPIO 34', desc: 'Encoder data' },
            { from: 'CLK', to: 'GPIO 35', desc: 'Encoder clock' },
          ],
        },
      ],
    },
  },
}

// ── Primitives ─────────────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-jf-text-primary">{title}</h2>
      {description && <p className="text-sm text-jf-text-secondary mt-1">{description}</p>}
    </div>
  )
}

function PinTable({ title, note, rows }: PinTableData) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-jf-text-primary mb-1">{title}</h3>
      {note && <p className="text-xs text-jf-text-muted mb-2">{note}</p>}
      <div className="rounded-lg border border-jf-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-jf-border bg-jf-elevated">
              <th className="text-left px-3 py-2 text-jf-text-muted font-medium">Component pin</th>
              <th className="text-left px-3 py-2 text-jf-text-muted font-medium">ESP32 pin</th>
              <th className="text-left px-3 py-2 text-jf-text-muted font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-jf-border last:border-0 hover:bg-jf-elevated/50">
                <td className="px-3 py-2 font-mono text-jf-primary font-medium">{row.from}</td>
                <td className="px-3 py-2 font-mono text-jf-text-primary">{row.to}</td>
                <td className="px-3 py-2 text-jf-text-secondary">{row.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Callout({ variant = 'info', children }: { variant?: 'info' | 'warn'; children: React.ReactNode }) {
  const styles = {
    info: 'border-jf-primary/30 bg-jf-primary-muted text-jf-primary',
    warn: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  }
  const icons = {
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    warn: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  }
  return (
    <div className={`flex gap-3 p-3 rounded-lg border text-sm leading-relaxed mb-4 ${styles[variant]}`}>
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[variant]} />
      </svg>
      <div className="text-jf-text-secondary">{children}</div>
    </div>
  )
}

function SkuSwitcher({ active }: { active: SkuId }) {
  return (
    <div className="inline-flex rounded-lg border border-jf-border bg-jf-surface p-0.5 mb-5">
      {SKUS.map((sku) => {
        const href = sku.id === 'jb-eink-v1' ? '/docs/hardware' : `/docs/hardware?sku=${sku.id}`
        const isActive = sku.id === active
        return (
          <Link
            key={sku.id}
            href={href}
            className={
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors ' +
              (isActive
                ? 'bg-jf-primary text-white shadow-sm'
                : 'text-jf-text-secondary hover:text-jf-text-primary hover:bg-jf-elevated')
            }
          >
            {sku.shortName}
          </Link>
        )
      })}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export const metadata: Metadata = { title: 'Components & Wiring — Jellybox Docs' }

export default async function HardwarePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const skuParam = typeof params.sku === 'string' ? params.sku : 'jb-eink-v1'
  if (!(skuParam in HARDWARE)) redirect('/docs/hardware')

  const skuId = skuParam as SkuId
  const SKU = getSku(skuId)
  const cfg = HARDWARE[skuId]

  return (
    <div>
      <div className="mb-8">
        <Link href="/docs" className="text-xs text-jf-text-muted hover:text-jf-primary transition-colors">
          ← Self-hosting guide
        </Link>
        <h1 className="text-3xl font-bold text-jf-text-primary mt-3 mb-3">Components &amp; wiring</h1>
        <p className="text-jf-text-secondary leading-relaxed">{cfg.intro}</p>

        <div className="mt-5">
          <SkuSwitcher active={skuId} />
        </div>

        <div className="rounded-lg border border-jf-primary/30 bg-jf-primary-muted px-4 py-3 text-sm leading-relaxed text-jf-text-secondary">
          <strong className="text-jf-text-primary">{SKU.displayName}</strong> (<code className="font-mono text-xs">{SKU.id}</code>).
          These instructions apply to this hardware variant only — other Jellybox SKUs use different
          displays, pinouts, and peripherals.
        </div>

        <figure className="mt-6 rounded-xl overflow-hidden border border-jf-border bg-jf-surface">
          <LightboxImage
            src={cfg.wiring.diagramImage}
            alt={cfg.wiring.diagramAlt}
            width={1600}
            height={1200}
            sizes="(max-width: 768px) 100vw, 720px"
            className="w-full h-auto"
            priority
            unoptimized
          />
          <figcaption className="px-4 py-3 text-xs text-jf-text-muted border-t border-jf-border">
            {cfg.wiring.diagramCaption}
          </figcaption>
        </figure>
      </div>

      {/* BOM */}
      <section className="mb-10">
        <SectionHeader
          title="Bill of materials"
          description="All components are available on Amazon, AliExpress, or Adafruit."
        />
        <div className="rounded-xl border border-jf-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-jf-border bg-jf-elevated">
                <th className="text-left px-4 py-2.5 text-jf-text-muted font-medium text-xs">Component</th>
                <th className="text-left px-4 py-2.5 text-jf-text-muted font-medium text-xs">Notes</th>
                <th className="text-left px-4 py-2.5 text-jf-text-muted font-medium text-xs">Qty</th>
              </tr>
            </thead>
            <tbody>
              {cfg.bom.map((item) => (
                <tr key={item.component} className="border-b border-jf-border last:border-0 hover:bg-jf-elevated/40">
                  <td className="px-4 py-3 font-medium text-jf-text-primary whitespace-nowrap">{item.component}</td>
                  <td className="px-4 py-3 text-jf-text-secondary text-xs leading-relaxed">{item.notes}</td>
                  <td className="px-4 py-3 text-jf-text-muted text-xs">{item.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Custom PCB */}
      <section className="mb-10">
        <SectionHeader
          title="Custom PCB"
          description="Skip the breadboard — a drop-in PCB that routes every connection above onto a single board."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <figure className="rounded-xl overflow-hidden border border-jf-border bg-jf-surface">
            <LightboxImage
              src={cfg.pcb.topImage}
              alt={`Top side of the ${SKU.id} PCB.`}
              width={1600}
              height={1200}
              sizes="(max-width: 768px) 100vw, 360px"
              className="w-full h-auto"
              unoptimized
            />
            <figcaption className="px-4 py-3 text-xs text-jf-text-muted border-t border-jf-border">
              {cfg.pcb.topCaption}
            </figcaption>
          </figure>
          <figure className="rounded-xl overflow-hidden border border-jf-border bg-jf-surface">
            <LightboxImage
              src={cfg.pcb.bottomImage}
              alt={`Bottom side of the ${SKU.id} PCB.`}
              width={1600}
              height={1200}
              sizes="(max-width: 768px) 100vw, 360px"
              className="w-full h-auto"
              unoptimized
            />
            <figcaption className="px-4 py-3 text-xs text-jf-text-muted border-t border-jf-border">
              {cfg.pcb.bottomCaption}
            </figcaption>
          </figure>
        </div>

        <figure className="rounded-xl overflow-hidden border border-jf-border bg-white mb-4">
          <LightboxImage
            src={cfg.pcb.schematicSvg}
            alt={`Schematic of the ${SKU.id} PCB.`}
            width={1600}
            height={1100}
            sizes="(max-width: 768px) 100vw, 720px"
            className="w-full h-auto"
            unoptimized
          />
          <figcaption className="px-4 py-3 text-xs text-jf-text-muted border-t border-jf-border bg-jf-surface">
            Schematic — exported from the KiCad source.
          </figcaption>
        </figure>

        <div className="mb-4">
          <StlModelViewerLoader
            models={[
              {
                label: 'PCB',
                description: `Bare ${SKU.id} board — drag to rotate, scroll to zoom.`,
                url: cfg.pcb.stl,
                filename: `${SKU.id}.stl`,
                color: '#2F7A3C',
              },
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          {cfg.pcb.tindieUrl ? (
            <a
              href={cfg.pcb.tindieUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-jf-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Buy on Tindie
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : (
            <span
              aria-disabled="true"
              title="Link coming soon"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-jf-elevated border border-jf-border text-jf-text-muted text-sm font-medium opacity-60 cursor-not-allowed select-none"
            >
              Buy on Tindie
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </span>
          )}
          <a
            href={cfg.pcb.gerbersZip}
            download
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg border border-jf-border bg-jf-elevated text-jf-text-primary text-sm font-medium hover:border-jf-primary/50 transition-colors"
          >
            Download gerbers (ZIP)
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        </div>

        <p className="text-sm text-jf-text-secondary leading-relaxed mb-3">
          Want to fabricate your own? The <strong className="text-jf-text-primary">Download
          gerbers</strong> button above gives you the manufacturing files as a single ZIP.
          Upload it directly to a fab house like{' '}
          <a href="https://jlcpcb.com" target="_blank" rel="noopener noreferrer"
            className="text-jf-primary hover:underline">JLCPCB</a>,{' '}
          <a href="https://www.pcbway.com" target="_blank" rel="noopener noreferrer"
            className="text-jf-primary hover:underline">PCBWay</a>, or{' '}
          <a href="https://oshpark.com" target="_blank" rel="noopener noreferrer"
            className="text-jf-primary hover:underline">OSH Park</a>.
        </p>

        <SectionHeader
          title="Board dimensions &amp; mounting holes"
          description="For anyone designing their own enclosure or 3D-printed shell around the PCB."
        />

        <p className="text-sm text-jf-text-secondary leading-relaxed mb-3">
          {cfg.pcb.dimensions}
        </p>

        {cfg.pcb.holes.length > 0 && (
          <div className="rounded-lg border border-jf-border overflow-hidden mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-jf-border bg-jf-elevated">
                  <th className="text-left px-3 py-2 text-jf-text-muted font-medium">Hole</th>
                  <th className="text-left px-3 py-2 text-jf-text-muted font-medium">X (mm)</th>
                  <th className="text-left px-3 py-2 text-jf-text-muted font-medium">Y (mm)</th>
                  <th className="text-left px-3 py-2 text-jf-text-muted font-medium">Ø (mm)</th>
                </tr>
              </thead>
              <tbody>
                {cfg.pcb.holes.map((h) => (
                  <tr key={h.id} className="border-b border-jf-border last:border-0 hover:bg-jf-elevated/50">
                    <td className="px-3 py-2 font-mono text-jf-primary font-medium">{h.id}</td>
                    <td className="px-3 py-2 font-mono text-jf-text-primary">{h.x}</td>
                    <td className="px-3 py-2 font-mono text-jf-text-primary">{h.y}</td>
                    <td className="px-3 py-2 font-mono text-jf-text-primary">{h.d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-sm text-jf-text-secondary leading-relaxed mb-3">
          For the full, dimensioned reference — including every via and component
          hole — see the drill map:
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <a
            href={cfg.pcb.drillMapPdf}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg border border-jf-border bg-jf-elevated text-jf-text-primary text-sm font-medium hover:border-jf-primary/50 transition-colors"
          >
            Drill map (PDF)
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        <Callout>
          This PCB fits the <strong className="text-jf-text-primary">{SKU.displayName}</strong>{' '}
          (<code className="font-mono text-xs">{SKU.id}</code>) build only — other Jellybox SKUs
          use different displays and peripherals and will need their own boards.
        </Callout>

        <p className="text-xs text-jf-text-muted mt-3">
          No PCB? See the hand-wired pinout below.
        </p>
      </section>

      {/* Wiring */}
      <section className="mb-10">
        <SectionHeader
          title="Wiring"
          description="All components run on 3.3 V logic and are directly compatible with the ESP32. The NeoPixel ring can be powered from 5 V for full brightness, or 3.3 V for dimmer but safer operation."
        />

        <Callout variant="warn">
          Make sure the PN532 module&apos;s mode-select switches are set to <strong>I²C</strong> before
          wiring — most boards ship in UART mode. The switch position is printed on the PCB silkscreen
          (usually SEL0 = ON, SEL1 = OFF).
        </Callout>

        <PinTable
          title="PN532 NFC reader (I²C)"
          note="IRQ and RST are not used by the firmware yet — leave those pins on the PN532 disconnected."
          rows={[
            { from: 'VCC', to: '3.3V', desc: '3.3 V only — do not use 5 V' },
            { from: 'GND', to: 'GND', desc: '' },
            { from: 'SDA', to: 'GPIO 21', desc: 'I²C data — add 4.7 kΩ pull-up to 3.3 V if signal is unstable' },
            { from: 'SCL', to: 'GPIO 22', desc: 'I²C clock' },
          ]}
        />

        <PinTable {...cfg.wiring.displayTable} />

        <PinTable
          title="NeoPixel 16-LED ring (WS2812B)"
          rows={[
            { from: 'VCC / +5V', to: '5V (VIN)', desc: 'Use 5 V from the ESP32 VIN pin for full brightness. 3.3 V also works at lower brightness.' },
            { from: 'GND', to: 'GND', desc: '' },
            { from: 'DIN', to: 'GPIO 27', desc: 'Data signal — a 300–500 Ω series resistor on this line is recommended to prevent ringing' },
          ]}
        />

        {cfg.wiring.extraTables?.map((t) => (
          <PinTable key={t.title} {...t} />
        ))}

        <Callout>
          Keep wires short and tidy. SPI buses are particularly sensitive to long wires at high
          clock speeds — if you see corrupted display output, try reducing the SPI clock or
          shortening the wires.
        </Callout>
      </section>

      {/* Power */}
      <section className="mb-10">
        <SectionHeader
          title="Power"
          description="Jellybox is designed as a portable, battery-powered device — not a tethered USB gadget."
        />
        <p className="text-sm text-jf-text-secondary leading-relaxed mb-3">
          The assembly draws around 200–300 mA at 5 V when active (mostly the NeoPixel ring). A
          single-cell LiPo (1000–2000 mAh) wired through a <strong className="text-jf-text-primary">TP4056</strong>{' '}
          charger board gives a good balance of runtime and size, and lets you recharge over USB without
          removing the cell.
        </p>

        <PinTable
          title="Battery wiring (TP4056 → ESP32)"
          note="Fit a power switch in line between the TP4056 output and the ESP32 so the device can be fully turned off when not in use."
          rows={[
            { from: 'LiPo +', to: 'TP4056 B+', desc: 'Battery positive into the charger board' },
            { from: 'LiPo −', to: 'TP4056 B−', desc: 'Battery negative into the charger board' },
            { from: 'TP4056 OUT+', to: 'Switch → ESP32 5V / VIN', desc: 'Run the positive output through an SPDT switch, then into the ESP32 5 V rail' },
            { from: 'TP4056 OUT−', to: 'ESP32 GND', desc: 'Common ground' },
          ]}
        />

        <Callout variant="warn">
          Always wire the switch on the <strong>TP4056 output</strong> (not between the battery and
          the charger). This way the cell can still charge over USB while the device is switched off.
        </Callout>

        <p className="text-sm text-jf-text-secondary leading-relaxed">
          The firmware does not use the ESP32&apos;s deep-sleep mode yet, so the device stays active
          while switched on. Expect a few hours of runtime from a 2000 mAh cell — flip the switch off
          between uses to extend battery life.
        </p>
      </section>

      {/* Stickers */}
      <section className="mb-10">
        <SectionHeader
          title="Tag stickers"
          description="Credit-card-format NFC stickers are the easiest tag form factor — slim, cheap, and printable."
        />
        <p className="text-sm text-jf-text-secondary leading-relaxed mb-3">
          Jellybox is built around standard ISO 14443A tags, but the recommended form factor is a{' '}
          <strong className="text-jf-text-primary">CR80 credit-card-sized PVC sticker</strong>{' '}
          (85.6 × 53.98 mm) with an embedded NTAG213 or NTAG215 chip. They&apos;re the same shape
          as a bank card, so they sit neatly in a wallet, a binder pocket, or a display rack next
          to the device — and the rigid white face takes printed artwork well.
        </p>

        <p className="text-sm text-jf-text-secondary leading-relaxed mb-3">
          The dashboard includes a built-in <strong className="text-jf-text-primary">sticker
          sheet designer</strong> at <Link href="/dashboard/tags/sticker-sheet"
          className="text-jf-primary hover:underline">Tags → Create sticker sheet</Link>. It:
        </p>

        <ul className="text-sm text-jf-text-secondary leading-relaxed list-disc pl-5 space-y-1 mb-4">
          <li>Pre-fills one sticker per registered RFID tag, pulling the poster or album artwork
            from the linked Jellyfin (or extension) item.</li>
          <li>Lays stickers out on A4 at exact CR80 dimensions, with cut marks and a safe-print
            border so they trim cleanly with a guillotine or scissors.</li>
          <li>Lets you tweak title text, swap artwork, choose landscape or portrait, and set text
            colour per card before printing.</li>
        </ul>

        <figure className="my-6 rounded-xl overflow-hidden border border-jf-border bg-jf-surface">
          <LightboxImage
            src="/stickers.png"
            alt="A Jellybox device on a child's table next to an open ring-binder folio holding printed children's-book sticker cards, with more cards (Tractor Ted, The Gruffalo, Bluey, Kipper) laid out in front."
            width={1122}
            height={1402}
            sizes="(max-width: 768px) 100vw, 540px"
            className="w-full h-auto"
            unoptimized
          />
          <figcaption className="px-4 py-3 text-xs text-jf-text-muted border-t border-jf-border">
            Printed CR80 sticker cards stored in a ring-binder folio — one per tag, ready to scan.
          </figcaption>
        </figure>

        <Callout variant="warn">
          Print at <strong>100% scale</strong> — disable any &ldquo;fit to page&rdquo; or
          &ldquo;shrink to fit&rdquo; option in your browser&apos;s print dialog, or the
          stickers won&apos;t line up with the cut marks.
        </Callout>

        <p className="text-sm text-jf-text-secondary leading-relaxed">
          Look for &ldquo;NTAG213 PVC card&rdquo; or &ldquo;NTAG215 NFC card&rdquo; on Amazon or
          AliExpress, sold in packs of 10–50. NTAG215 has more user memory (504 bytes) but
          Jellybox only stores the UID, so NTAG213 (144 bytes) is plenty.
        </p>
      </section>

      <div className="pt-4 border-t border-jf-border">
        <p className="text-sm text-jf-text-secondary">
          Hardware assembled?{' '}
          <Link href="/docs/firmware" className="text-jf-primary hover:underline">
            Flash the firmware →
          </Link>
        </p>
      </div>
    </div>
  )
}
