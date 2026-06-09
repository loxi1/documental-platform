// src/layout/AppSidebar.tsx
"use client";

import React, { useEffect, useRef, useState, type RefCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { LayoutDashboard, Users, Boxes } from "lucide-react";
import Image from "next/image";

// 👇 agrega el tipo de props
type AppSidebarProps = {
  userCod?: string | null;
};

type NavItem = {
  name: string;
  icon?: React.ReactNode;
  path?: string;
  badge?: string;
  subItems?: { name: string; path: string }[];
};

const navItems: NavItem[] = [
  { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { name: "Usuarios", path: "/usuarios", icon: <Users className="h-5 w-5" /> },
  { name: "Artículos", path: "/articulos", icon: <Boxes className="h-5 w-5" /> },
];

const AppSidebar: React.FC<AppSidebarProps> = ({ userCod }) => {
  const pathname = usePathname();
  const { isMobileOpen, setIsHovered, toggleMobileSidebar } = useSidebar();
  const [openSubmenu, setOpenSubmenu] = useState<{ type: "main" | "others"; index: number } | null>(null);
  const subMenuRefs = useRef<Record<string, HTMLUListElement | null>>({});
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});

  const isActive = (href = "") => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    setOpenSubmenu(null);
  }, [pathname]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      const el = subMenuRefs.current[key];
      if (el) setSubMenuHeight((prev) => ({ ...prev, [key]: el.scrollHeight }));
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prev) =>
      prev && prev.type === menuType && prev.index === index ? null : { type: menuType, index }
    );
  };

  const handleMobileNavigate = () => {
    if (isMobileOpen) toggleMobileSidebar();
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="space-y-1">
      {items.map((nav, index) => {
        const active = isActive(nav.path);
        return (
          <li key={`${menuType}-${nav.name}`}>
            {nav.subItems ? (
              <>
                <button
                  onClick={() => handleSubmenuToggle(index, menuType)}
                  className={`menu-item group w-full text-left ${
                    openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? "menu-item-active"
                      : "menu-item-inactive"
                  }`}
                  aria-expanded={openSubmenu?.type === menuType && openSubmenu?.index === index}
                >
                  {nav.icon ? <span className="menu-item-icon">{nav.icon}</span> : null}
                  <span className="menu-item-text">{nav.name}</span>
                  <span
                    className={`menu-item-arrow ${
                      openSubmenu?.type === menuType && openSubmenu?.index === index
                        ? "menu-item-arrow-active"
                        : "menu-item-arrow-inactive"
                    }`}
                  >
                    ▼
                  </span>
                </button>
                <ul
                  ref={
                    ((el) => {
                      subMenuRefs.current[`${menuType}-${index}`] = el;
                    }) as RefCallback<HTMLUListElement>
                  }
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    height:
                      openSubmenu?.type === menuType && openSubmenu?.index === index
                        ? `${subMenuHeight[`${menuType}-${index}`] || "auto"}px`
                        : "0px",
                  }}
                >
                  {nav.subItems.map((sub) => {
                    const subActive = isActive(sub.path);
                    return (
                      <li key={sub.path}>
                        <Link
                          href={sub.path}
                          onClick={handleMobileNavigate}
                          className={`menu-dropdown-item ${
                            subActive ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"
                          }`}
                          aria-current={subActive ? "page" : undefined}
                        >
                          {sub.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <Link
                href={nav.path || "#"}
                onClick={handleMobileNavigate}
                className={`menu-item group ${active ? "menu-item-active" : "menu-item-inactive"}`}
                aria-current={active ? "page" : undefined}
              >
                {nav.icon ? <span className="menu-item-icon">{nav.icon}</span> : null}
                <span className="menu-item-text">{nav.name}</span>
                {nav.badge && (
                  <span className={`menu-dropdown-badge ${active ? "menu-dropdown-badge-active" : "menu-dropdown-badge-inactive"}`}>
                    {nav.badge}
                  </span>
                )}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      role="navigation"
      aria-label="Menú principal"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-sm transition-transform dark:bg-[#0B1221]
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
    >
      <div className="flex items-center justify-center px-6 py-5">
        <Image
          src="/images/logo/logo.svg"
          alt="ARASAC"
          width={160}
          height={36}
          priority
          className="block h-9 w-auto dark:hidden"
        />
        <Image
          src="/images/logo/auth-dark.svg"
          alt="ARASAC"
          width={160}
          height={36}
          priority
          className="hidden h-9 w-auto dark:block"
        />
      </div>

      {userCod ? (
        <div className="px-6 pb-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 dark:border-white/10 dark:bg-white/10 dark:text-gray-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {userCod}
          </span>
        </div>
      ) : null}

      <nav className="p-4 overflow-y-auto">{renderMenuItems(navItems, "main")}</nav>
    </aside>
  );
};

export default AppSidebar;