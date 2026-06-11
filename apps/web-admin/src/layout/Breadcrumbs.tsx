"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const labels: Record<string, string> = {
  dashboard: "Dashboard",
  "ocr-resultados": "OCR Resultados",
  expedientes: "Expedientes",
  documentos: "Documentos",
  "revision-contable": "Revisión Contable",
  alertas: "Alertas",
  configuracion: "Configuración",
};

function formatSegment(segment: string) {
  return labels[segment] ?? decodeURIComponent(segment);
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const paths = segments.map((segment, index) => ({
    label: formatSegment(segment),
    href: `/${segments.slice(0, index + 1).join("/")}`,
    isLast: index === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
        Inicio
      </Link>

      {paths.map((item) => (
        <div key={item.href} className="flex min-w-0 items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
          {item.isLast ? (
            <span className="truncate rounded-lg px-2 py-1 font-medium text-foreground">
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="truncate rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
