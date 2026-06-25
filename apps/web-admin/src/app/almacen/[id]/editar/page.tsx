"use client";

import { useParams } from "next/navigation";

import { AlmacenExpedienteEditor } from "@/components/almacen/AlmacenExpedienteEditor";

export default function AlmacenEditarPage() {
  const params = useParams<{ id: string }>();

  return <AlmacenExpedienteEditor id={params.id} />;
}
