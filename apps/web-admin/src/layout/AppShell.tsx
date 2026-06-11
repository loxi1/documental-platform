// apps/web-admin/src/layout/AppShell.tsx
'use client'

import { usePathname } from 'next/navigation'
import DefaultLayout from './DefaultLayout'

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const publicRoutes = ['/login']

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return <>{children}</>
  }

  return <DefaultLayout>{children}</DefaultLayout>
}