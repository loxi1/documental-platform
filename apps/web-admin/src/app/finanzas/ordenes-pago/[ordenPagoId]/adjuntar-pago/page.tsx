"use client";

import { useParams } from "next/navigation";

import { OrdenPagoAdjuntarPagoView } from "@/components/finanzas/OrdenPagoAdjuntarPagoView";

export default function OrdenPagoAdjuntarPagoPage() {
  const params = useParams<{ ordenPagoId: string }>();

  return (
    <OrdenPagoAdjuntarPagoView ordenPagoId={params.ordenPagoId} />
  );
}