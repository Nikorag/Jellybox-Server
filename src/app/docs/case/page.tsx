import type { Metadata } from 'next'
import Link from 'next/link'
import StlModelViewerLoader from '@/components/docs/StlModelViewerLoader'

export const metadata: Metadata = { title: 'Case & STL Files — Jellybox Docs' }

const RAW_BASE = 'https://raw.githubusercontent.com/Nikorag/Jellybox-Firmware/main/models'

export default function CasePage() {
  return (
    <div>
      <div className="mb-8">
        <Link href="/docs" className="text-xs text-jf-text-muted hover:text-jf-primary transition-colors">
          ← Self-hosting guide
        </Link>
        <h1 className="text-3xl font-bold text-jf-text-primary mt-3 mb-3">Case &amp; STL files</h1>
        <p className="text-jf-text-secondary leading-relaxed">
          A 3D-printable enclosure designed to fit the ESP32 dev board, Waveshare 2.9&quot; eInk
          display, PN532 NFC module, and 12-LED NeoPixel ring.
        </p>
        <a
          href="https://www.tinkercad.com/things/9veK57fYtEN-jellybox-case?sharecode=Kz9MUFZP3gR27f36WOPv8fyj_9rZoQ1cSTjR1Jlf0dc"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-sm text-jf-primary hover:text-jf-primary-hover transition-colors"
        >
          View on Tinkercad
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Interactive viewer */}
      <StlModelViewerLoader />

      {/* Download cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {[
          {
            label: 'Jellybox Case',
            description: 'Main body — houses the ESP32, eInk display, NFC module, and NeoPixel ring. Includes the NFC pass-through area for scanning.',
            href: `${RAW_BASE}/Jellybox%20Case.stl`,
            filename: 'Jellybox Case.stl',
          },
          {
            label: 'Jellybox Lid',
            description: 'Top panel — screws onto the case body to enclose the electronics.',
            href: `${RAW_BASE}/Jellybox%20Lid.stl`,
            filename: 'Jellybox Lid.stl',
          },
        ].map((file) => (
          <a
            key={file.label}
            href={file.href}
            download={file.filename}
            className="group flex items-start gap-4 p-5 rounded-xl border border-jf-border bg-jf-surface hover:border-jf-primary/50 hover:bg-jf-elevated transition-colors"
          >
            <div className="mt-0.5 w-10 h-10 shrink-0 rounded-lg bg-jf-elevated border border-jf-border flex items-center justify-center group-hover:border-jf-primary/40 transition-colors">
              <svg className="w-5 h-5 text-jf-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-jf-text-primary group-hover:text-jf-primary transition-colors">
                {file.label} <span className="text-jf-text-muted font-normal">.stl</span>
              </p>
              <p className="text-xs text-jf-text-secondary mt-0.5 leading-relaxed">{file.description}</p>
              <p className="text-xs text-jf-primary mt-2 font-medium">Download →</p>
            </div>
          </a>
        ))}
      </div>

      {/* What to expect */}
      <section className="mt-10">
        <h2 className="text-base font-semibold text-jf-text-primary mb-4">What&apos;s included</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: 'Two-part screwed shell',
              description: 'Case and lid are held together with screws. Designed for FDM printing in PLA or PETG.',
            },
            {
              title: 'eInk window',
              description: 'A precise cutout for the Waveshare 2.9″ display. The bezel holds the panel in place without adhesive.',
            },
            {
              title: 'NFC pass-through',
              description: 'The case body is thin over the PN532 antenna area so cards and tags can be scanned through it.',
            },
            {
              title: 'LED diffuser ring',
              description: 'A frosted diffuser ring around the edge softens the NeoPixel glow into a uniform halo.',
            },
            {
              title: 'USB cutout',
              description: 'Side opening for the ESP32\'s USB port so the device can be powered without disassembly.',
            },
          ].map((item) => (
            <div key={item.title} className="p-4 rounded-xl border border-jf-border bg-jf-surface">
              <h3 className="text-sm font-medium text-jf-text-primary mb-1">{item.title}</h3>
              <p className="text-xs text-jf-text-secondary leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Print settings hint */}
      <section className="mt-8 p-4 rounded-xl border border-jf-border bg-jf-elevated">
        <h3 className="text-sm font-semibold text-jf-text-primary mb-2">Suggested print settings</h3>
        <ul className="text-xs text-jf-text-secondary space-y-1.5">
          <li><span className="font-medium text-jf-text-primary">Material:</span> PLA or PETG</li>
          <li><span className="font-medium text-jf-text-primary">Layer height:</span> 0.2 mm</li>
          <li><span className="font-medium text-jf-text-primary">Infill:</span> 20 % gyroid or grid</li>
          <li><span className="font-medium text-jf-text-primary">Supports:</span> Required (Jellybox logo)</li>
          <li><span className="font-medium text-jf-text-primary">Perimeters / walls:</span> 3</li>
        </ul>
      </section>
    </div>
  )
}
