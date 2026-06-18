"use client";

import { useParams } from "next/navigation";

import { CompraExpedienteView } from "@/components/compras/CompraExpedienteView";

export default function ComprasVerPage() {
  const params = useParams<{ id: string }>();

  return <CompraExpedienteView id={params.id} />;
}
