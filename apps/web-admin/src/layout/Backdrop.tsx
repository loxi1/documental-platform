"use client";

import React from "react";
import { useSidebar } from "@/context/SidebarContext";

const Backdrop: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();
  if (!isMobileOpen) return null;

  return (
    <div
      className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
      onClick={toggleMobileSidebar}
      aria-hidden
    />
  );
};

export default Backdrop;
