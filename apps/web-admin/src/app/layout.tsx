import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'
import DefaultLayout from '@/layout/DefaultLayout'

export const metadata: Metadata = {
  title: 'Documental Platform',
  description: 'Web Admin - Gestión Documental',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <DefaultLayout>{children}</DefaultLayout>
        </Providers>
      </body>
    </html>
  )
}
