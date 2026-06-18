"use client";

import { useParams } from "next/navigation";

import { CompraExpedienteEditor } from "@/components/compras/CompraExpedienteEditor";

export default function ComprasEditarPage() {
  const params = useParams<{ id: string }>();

  return <CompraExpedienteEditor id={params.id} />;
}
