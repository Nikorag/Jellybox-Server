import type { Metadata, Viewport } from 'next'
import { Quicksand } from 'next/font/google'
import './globals.css'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants'
import SessionProvider from '@/components/SessionProvider'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import { auth } from '@/auth'

const quicksand = Quicksand({ subsets: ['latin'], variable: '--font-quicksand' })

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s — ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#101010',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="en" className={quicksand.variable}>
      <body className="bg-jf-bg text-jf-text-primary antialiased">
        <ServiceWorkerRegistration />
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  )
}
