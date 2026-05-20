'use client'

import dynamic from 'next/dynamic'
import type { StlModel } from './StlModelViewer'

const StlModelViewer = dynamic(() => import('./StlModelViewer'), { ssr: false })

export default function StlModelViewerLoader({ models }: { models?: StlModel[] } = {}) {
  return <StlModelViewer models={models} />
}
