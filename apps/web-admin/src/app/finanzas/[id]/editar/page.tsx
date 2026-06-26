"use client";

import { useParams } from "next/navigation";

import { FinanzasExpedienteEditor } from "@/components/finanzas/FinanzasExpedienteEditor";

export default function FinanzasEditarPage() {
  const params = useParams<{ id: string }>();

  return <FinanzasExpedienteEditor id={params.id} />;
}
