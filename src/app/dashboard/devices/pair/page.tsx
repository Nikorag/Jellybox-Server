import type { Metadata } from 'next'
import PairDeviceFlow from '@/components/devices/PairDeviceFlow'

export const metadata: Metadata = { title: 'Pair Device' }

export default function PairDevicePage() {
  return <PairDeviceFlow />
}
