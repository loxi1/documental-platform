"use client";

import { useParams } from "next/navigation";

import { CompraExpedienteEditor } from "@/components/compras/CompraExpedienteEditor";

export default function ComprasVerPage() {
  const params = useParams<{ id: string }>();

  return <CompraExpedienteEditor id={params.id} modoSoloLectura />;
}
