"use client";

import { useParams } from "next/navigation";

import { AlmacenExpedienteView } from "@/components/almacen/AlmacenExpedienteView";

export default function AlmacenVerPage() {
  const params = useParams<{ id: string }>();

  return <AlmacenExpedienteView id={params.id} />;
}
