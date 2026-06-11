"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SidebarContextValue = {
  isMobileOpen: boolean;
  isHovered: boolean;
  isCollapsed: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleSidebar: () => void;
  setIsHovered: (value: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

const SIDEBAR_COLLAPSED_KEY = "documental_sidebar_collapsed";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      setIsCollapsed(stored === "true");
    } catch {
      setIsCollapsed(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      isMobileOpen,
      isHovered,
      isCollapsed,
      toggleMobileSidebar: () => setIsMobileOpen((current) => !current),
      closeMobileSidebar: () => setIsMobileOpen(false),
      toggleSidebar: () =>
        setIsCollapsed((current) => {
          const next = !current;
          try {
            window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
          } catch {
            // localStorage puede no estar disponible en algunos entornos.
          }
          return next;
        }),
      setIsHovered,
    }),
    [isMobileOpen, isHovered, isCollapsed],
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
