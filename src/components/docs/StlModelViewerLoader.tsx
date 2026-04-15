'use client'

import dynamic from 'next/dynamic'

const StlModelViewer = dynamic(() => import('./StlModelViewer'), { ssr: false })

export default function StlModelViewerLoader() {
  return <StlModelViewer />
}
