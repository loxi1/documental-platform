import Providers from './providers'
import AppShell from '@/layout/AppShell'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <ProtectedRoute>
            <AppShell>{children}</AppShell>
          </ProtectedRoute>
        </Providers>
      </body>
    </html>
  )
}
