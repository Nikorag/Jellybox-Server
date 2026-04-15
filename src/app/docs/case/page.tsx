import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Case & STL Files — Jellybox Docs' }

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
      </div>

      {/* Coming soon */}
      <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border-2 border-dashed border-jf-border bg-jf-surface">
        <div className="w-14 h-14 rounded-2xl bg-jf-elevated border border-jf-border flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-jf-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-jf-text-primary mb-2">STL files coming soon</h2>
        <p className="text-sm text-jf-text-secondary max-w-sm leading-relaxed">
          The case design is in progress. Files will be available to download here and linked from
          the GitHub repository when ready.
        </p>
      </div>

      {/* What to expect */}
      <section className="mt-10">
        <h2 className="text-base font-semibold text-jf-text-primary mb-4">What to expect</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: 'Two-part snap-fit shell',
              description: 'Top and bottom halves that clip together without screws. Designed for FDM printing in PLA or PETG.',
            },
            {
              title: 'eInk window',
              description: 'A precise cutout for the Waveshare 2.9″ display. The bezel holds the panel in place without adhesive.',
            },
            {
              title: 'NFC pass-through',
              description: 'The top face is thin over the PN532 antenna area so cards and tags can be scanned through the case.',
            },
            {
              title: 'LED diffuser ring',
              description: 'A frosted diffuser ring around the edge softens the NeoPixel glow into a uniform halo.',
            },
            {
              title: 'USB cutout',
              description: 'Side opening for the ESP32\'s USB port so the device can be powered without disassembly.',
            },
            {
              title: 'Wall mount option',
              description: 'Optional keyhole slot on the back so the device can hang on a screw.',
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
          <li><span className="font-medium text-jf-text-primary">Supports:</span> None required</li>
          <li><span className="font-medium text-jf-text-primary">Perimeters / walls:</span> 3</li>
        </ul>
      </section>

      <div className="mt-8 pt-4 border-t border-jf-border">
        <p className="text-sm text-jf-text-secondary">
          Want to be notified when the STL files are released? Watch the{' '}
          <a
            href="https://github.com/Nikorag/Jellybox-firmware"
            target="_blank"
            rel="noopener noreferrer"
            className="text-jf-primary hover:underline"
          >
            firmware repository
          </a>{' '}
          on GitHub.
        </p>
      </div>
    </div>
  )
}
