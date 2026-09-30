"use client";

import { useQuery } from "@tanstack/react-query";

import { getGrupoFacturaDocumentosV2 } from "@/services/documental-v2-workspace";

type Props = {
  grupoFacturaId: string | number | null | undefined;
  estadoRegularizacion?: string | null;
  conceptoAbreviatura?: string | null;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalizarGrupoId(
  value: string | number | null | undefined,
): string | number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }

  return null;
}

function esRegularizador(vinculo: Record<string, unknown>) {
  const estado = text(vinculo.estado).toLowerCase();
  const relacion = text(
    vinculo.tipoRelacion ?? vinculo.tipo_relacion,
  ).toLowerCase();

  return (
    estado === "activo" &&
    (
      relacion === "regularizador_factura" ||
      relacion === "regularizador_recibo_honorario"
    )
  );
}

function tipoRegularizador(vinculo: Record<string, unknown>) {
  const relacion = text(
    vinculo.tipoRelacion ?? vinculo.tipo_relacion,
  ).toLowerCase();

  if (relacion === "regularizador_factura") {
    return "Factura";
  }

  if (relacion === "regularizador_recibo_honorario") {
    return "Recibo por honorarios";
  }

  return "";
}

function identidadRegularizador(vinculo: Record<string, unknown>) {
  const metadata =
    vinculo.metadata &&
    typeof vinculo.metadata === "object" &&
    !Array.isArray(vinculo.metadata)
      ? (vinculo.metadata as Record<string, unknown>)
      : null;

  const documentoV1 =
    metadata?.documentoV1 &&
    typeof metadata.documentoV1 === "object" &&
    !Array.isArray(metadata.documentoV1)
      ? (metadata.documentoV1 as Record<string, unknown>)
      : null;

  const serie = text(
    vinculo.serie ??
      vinculo.documentoSerie ??
      documentoV1?.serie,
  );

  const numero = text(
    vinculo.numero ??
      vinculo.documentoNumero ??
      documentoV1?.numero,
  );

  if (serie && numero) return `${serie}-${numero}`;
  return serie || numero || "";
}

export function DocumentoRegularizadorOpCell({
  grupoFacturaId,
  estadoRegularizacion,
  conceptoAbreviatura,
}: Props) {
  const grupoId = normalizarGrupoId(grupoFacturaId);
  const estado = text(estadoRegularizacion).toUpperCase();
  const conceptoCompacto = text(conceptoAbreviatura);

  const query = useQuery({
    queryKey: [
      "finanzas-v2-grupo-regularizador-op",
      String(grupoId ?? ""),
    ],
    enabled: grupoId !== null && estado === "REGULARIZADO",
    queryFn: () =>
      getGrupoFacturaDocumentosV2(grupoId as string | number),
    staleTime: 30_000,
  });

  if (estado !== "REGULARIZADO" || grupoId === null) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (query.isLoading) {
    return (
      <span className="text-xs text-muted-foreground">
        Consultando…
      </span>
    );
  }

  if (query.isError) {
    return (
      <span className="text-muted-foreground">
        —
      </span>
    );
  }

  const regularizador = (query.data ?? [])
    .map((item) => item as Record<string, unknown>)
    .find(esRegularizador);

  if (!regularizador) {
    return <span className="text-muted-foreground">—</span>;
  }

  const tipo = tipoRegularizador(regularizador);
  const identidad = identidadRegularizador(regularizador);
  const tipoVisible = tipo || "Documento";
  const etiqueta =
    conceptoCompacto
      ? `${tipoVisible} · ${conceptoCompacto}`
      : tipoVisible;

  return (
    <div className="min-w-[120px] max-w-[180px] leading-tight">
      <div className="truncate whitespace-nowrap font-medium" title={etiqueta}>
        {etiqueta}
      </div>
      {identidad ? (
        <div
          className="mt-0.5 truncate whitespace-nowrap text-xs text-muted-foreground"
          title={identidad}
        >
          {identidad}
        </div>
      ) : null}
    </div>
  );
}
