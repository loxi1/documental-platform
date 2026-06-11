// apps/web-admin/src/layout/DefaultLayout.tsx
"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-background">
      <AppSidebar />
      <div
        className={`transition-[padding] duration-300 ${isCollapsed ? "lg:pl-16" : "lg:pl-64"}`}
      >
        <AppHeader />
        <main className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
