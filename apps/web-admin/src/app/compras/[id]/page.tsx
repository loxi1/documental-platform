import { redirect } from "next/navigation";

type ComprasExpedientePageProps = {
  params: Promise<{ id: string }>;
};

export default async function ComprasExpedientePage({
  params,
}: ComprasExpedientePageProps) {
  const { id } = await params;

  redirect(`/compras/${encodeURIComponent(id)}/editar`);
}
