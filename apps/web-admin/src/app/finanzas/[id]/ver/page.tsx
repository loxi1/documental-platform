"use client";

import { useParams } from "next/navigation";

import { FinanzasExpedienteView } from "@/components/finanzas/FinanzasExpedienteView";

export default function FinanzasVerPage() {
  const params = useParams<{ id: string }>();

  return <FinanzasExpedienteView id={params.id} />;
}
