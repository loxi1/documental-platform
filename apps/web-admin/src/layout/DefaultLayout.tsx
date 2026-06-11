// apps/web-admin/src/layout/DefaultLayout.tsx
'use client'

import AppHeader from './AppHeader'
import AppSidebar from './AppSidebar'

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="lg:pl-72">
        <AppHeader />
        <main className="px-6 py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}