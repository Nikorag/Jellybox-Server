'use client'

import { useEffect, useState } from 'react'
import Image, { type ImageProps } from 'next/image'

// Drop-in replacement for next/image in docs that opens the image in a full-
// viewport lightbox on click. ESC, backdrop click, or close button dismiss.
export default function LightboxImage(props: ImageProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full cursor-zoom-in p-0 m-0 bg-transparent border-0 text-left"
        aria-label={typeof props.alt === 'string' ? `Enlarge: ${props.alt}` : 'Enlarge image'}
      >
        <Image {...props} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={typeof props.alt === 'string' ? props.alt : 'Image preview'}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-8 cursor-zoom-out animate-[fadeIn_120ms_ease-out]"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen(false) }}
            aria-label="Close"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={typeof props.src === 'string' ? props.src : ''}
            alt={typeof props.alt === 'string' ? props.alt : ''}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default"
          />
        </div>
      )}
    </>
  )
}
