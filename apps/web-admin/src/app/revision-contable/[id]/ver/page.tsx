import { RevisionContableDetalle } from "@/components/revision-contable/RevisionContableDetalle";

type SearchValue = string | string[] | undefined;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, SearchValue>>;
};

function firstParam(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RevisionContableVerPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <RevisionContableDetalle
      expedienteId={resolvedParams.id}
      empresa={firstParam(resolvedSearchParams.empresa)}
      anio={firstParam(resolvedSearchParams.anio)}
      mes={firstParam(resolvedSearchParams.mes)}
    />
  );
}
