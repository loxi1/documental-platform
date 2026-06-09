"use client";

import LogoutButton from "@/components/auth/LogoutButtom";
import ThemeToggleButton from "@/components/common/ThemeToggleButton";
import { useSidebar } from "@/context/SidebarContext";

type Props = {
  userCod?: string | null;
};

export default function AppHeader( { userCod }:Props) {
  const { toggleMobileSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-[#0B1221]/60">

      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6">
        {/* Botón pequeño para abrir el sidebar en móvil */}
        <button
          onClick={toggleMobileSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5 md:hidden"
          aria-label="Abrir menú"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Marca */}
        <div className="font-semibold text-gray-800 dark:text-white">{userCod ? (
            userCod
          ) : null}</div>

        {/* Acciones derechas */}
        <div className="flex items-center gap-3">
          <ThemeToggleButton />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
