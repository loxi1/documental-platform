"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SidebarContextValue = {
  isMobileOpen: boolean;
  isHovered: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  setIsHovered: (value: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const value = useMemo(
    () => ({
      isMobileOpen,
      isHovered,
      toggleMobileSidebar: () => setIsMobileOpen((current) => !current),
      closeMobileSidebar: () => setIsMobileOpen(false),
      setIsHovered,
    }),
    [isMobileOpen, isHovered],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar debe usarse dentro de SidebarProvider");
  }

  return context;
}
