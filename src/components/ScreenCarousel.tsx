'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

type Slide = {
  src: string
  alt: string
  eyebrow: string
  title: string
  description: string
}

const SLIDE_MS = 6000

export function ScreenCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (paused) return
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, SLIDE_MS)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [paused, slides.length])

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative min-h-[820px] sm:min-h-[880px] lg:min-h-[600px]">
        {slides.map((slide, i) => {
          const phoneOnLeft = i % 2 === 0
          const isActive = i === index
          // Previous slide animates out to the opposite side it came from;
          // upcoming slide enters from its phone's side.
          const isPrev =
            i === (index === 0 ? slides.length - 1 : index - 1)

          let state: 'active' | 'prev' | 'hidden' = 'hidden'
          if (isActive) state = 'active'
          else if (isPrev) state = 'prev'

          return (
            <div
              key={slide.src}
              aria-hidden={!isActive}
              className={`absolute inset-0 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center transition-opacity duration-700 ${
                state === 'hidden' ? 'opacity-0 pointer-events-none' : 'opacity-100'
              } ${state === 'prev' ? 'pointer-events-none' : ''}`}
            >
              {/* Phone */}
              <div
                className={`${phoneOnLeft ? 'lg:order-1' : 'lg:order-2'} relative mx-auto w-full max-w-[220px] sm:max-w-[260px] lg:max-w-[300px] aspect-[9/19] transition-all duration-700 ease-out ${
                  state === 'active'
                    ? 'translate-x-0 opacity-100'
                    : state === 'prev'
                      ? `${phoneOnLeft ? '-translate-x-16' : 'translate-x-16'} opacity-0`
                      : `${phoneOnLeft ? '-translate-x-16' : 'translate-x-16'} opacity-0`
                }`}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 blur-3xl opacity-50 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(50% 50% at 50% 50%, rgba(170, 92, 194, 0.4), transparent 70%)',
                  }}
                />
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  sizes="(max-width: 1024px) 80vw, 300px"
                  className="object-contain drop-shadow-2xl"
                  priority={i === 0}
                />
              </div>

              {/* Copy */}
              <div
                className={`${phoneOnLeft ? 'lg:order-2 lg:text-left' : 'lg:order-1 lg:text-right'} text-center transition-all duration-700 ease-out ${
                  state === 'active'
                    ? 'translate-x-0 opacity-100'
                    : `${phoneOnLeft ? 'translate-x-16' : '-translate-x-16'} opacity-0`
                }`}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jf-primary-muted border border-jf-primary/30 text-jf-primary text-xs font-medium mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-jf-primary" />
                  {slide.eyebrow}
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-jf-text-primary mb-4 leading-tight">
                  {slide.title}
                </h3>
                <p
                  className={`text-jf-text-secondary text-base leading-relaxed max-w-md mx-auto ${phoneOnLeft ? 'lg:mx-0' : 'lg:ml-auto lg:mr-0'}`}
                >
                  {slide.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-10">
        {slides.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show slide ${i + 1}: ${slide.title}`}
            className={`h-2 rounded-full transition-all ${
              i === index
                ? 'w-8 bg-jf-primary'
                : 'w-2 bg-jf-border hover:bg-jf-text-muted'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
