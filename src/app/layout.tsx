import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants'
import SessionProvider from '@/components/SessionProvider'
import { auth } from '@/auth'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s — ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
}

export const viewport: Viewport = {
  themeColor: '#101010',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-jf-bg text-jf-text-primary antialiased">
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  )
}
