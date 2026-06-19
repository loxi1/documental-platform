"use client";

import Link from "next/link";
import { Eye, FilePlus2, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useExpedientes } from "@/hooks/useExpedientes";
import type { Expediente, ExpedienteDocumento } from "@/types/expediente";

type ExpedientesApiResponse = {
  total?: number;
  limit?: number;
  offset?: number;
  data?: Expediente[];
};

function normalizeExpedientes(input: unknown): Expediente[] {
  if (Array.isArray(input)) return input as Expediente[];

  if (
    input &&
    typeof input === "object" &&
    "data" in input &&
    Array.isArray((input as ExpedientesApiResponse).data)
  ) {
    return (input as ExpedientesApiResponse).data ?? [];
  }

  return [];
}

function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function field<T = unknown>(source: unknown, key: string): T | undefined {
  if (!source || typeof source !== "object") return undefined;
  return (source as unknown as Record<string, T | undefined>)[key];
}

function getEmpresa(expediente: Expediente) {
  return text(
    field(expediente, "empresa_codigo") ?? field(expediente, "empresaCodigo"),
    "-",
  );
}

function getCodigoExpediente(expediente: Expediente) {
  return text(
    field(expediente, "codigo_expediente") ?? field(expediente, "codigoExpediente"),
    "",
  );
}

function getClienteNombre(expediente: Expediente) {
  return text(
    field(expediente, "cliente_nombre") ??
      field(expediente, "clienteNombre") ??
      field(expediente, "cliente_abreviatura") ??
      field(expediente, "clienteAbreviatura") ??
      getEmpresa(expediente),
    "-",
  );
}

function getDescripcion(expediente: Expediente) {
  return text(field(expediente, "descripcion"), "Pendiente de descripción");
}

function getEstado(expediente: Expediente) {
  return text(field(expediente, "estado"), "abierto");
}

function getPrincipal(expediente: Expediente): ExpedienteDocumento | null {
  const documentoPrincipal = field<ExpedienteDocumento | null>(
    expediente,
    "documentoPrincipal",
  );

  if (documentoPrincipal) return documentoPrincipal;

  const documentosPrincipales = field<ExpedienteDocumento[]>(
    expediente,
    "documentosPrincipales",
  );
  const documentos = field<ExpedienteDocumento[]>(expediente, "documentos");
  const documentosAdjuntos = field<ExpedienteDocumento[]>(
    expediente,
    "documentosAdjuntos",
  );

  return (
    documentosPrincipales?.[0] ??
    documentos?.find((documento) => Boolean(field(documento, "esPrincipal"))) ??
    documentosAdjuntos?.find((documento) => Boolean(field(documento, "esPrincipal"))) ??
    null
  );
}

function getAllDocuments(expediente: Expediente) {
  const documentos = field<ExpedienteDocumento[]>(expediente, "documentos") ?? [];
  const documentosPrincipales =
    field<ExpedienteDocumento[]>(expediente, "documentosPrincipales") ?? [];
  const documentoPrincipal = field<ExpedienteDocumento | null>(
    expediente,
    "documentoPrincipal",
  );
  const documentosAdjuntos =
    field<ExpedienteDocumento[]>(expediente, "documentosAdjuntos") ?? [];

  return [
    ...documentos,
    ...documentosPrincipales,
    ...(documentoPrincipal ? [documentoPrincipal] : []),
    ...documentosAdjuntos,
  ];
}

function hasDocument(expediente: Expediente, aliases: string[]) {
  const normalizedAliases = aliases.map((alias) => alias.toUpperCase());

  return getAllDocuments(expediente).some((documento) => {
    const doc = documento as unknown as Record<string, unknown>;
    const tipo = String(doc.tipoDocumental ?? doc.tipo_documental ?? "").toUpperCase();
    const relacion = String(doc.tipoRelacion ?? doc.tipo_relacion ?? "").toUpperCase();

    return normalizedAliases.some(
      (alias) => tipo.includes(alias) || relacion.includes(alias),
    );
  });
}

function principalLabel(expediente: Expediente) {
  const principal = getPrincipal(expediente);

  if (!principal) return "Sin principal";

  const doc = principal as unknown as Record<string, unknown>;
  const tipo = text(doc.tipoDocumental ?? doc.tipo_documental ?? doc.tipoRelacion ?? doc.tipo_relacion, "DOC")
    .replace("PRINCIPAL_", "")
    .replace("ADJUNTO_", "")
    .replaceAll("_", " ")
    .toUpperCase();

  const serie = text(doc.serie);
  const numero = text(doc.numero);
  const labelNumero = [serie, numero].filter(Boolean).join("-");

  return labelNumero ? `${tipo} ${labelNumero}` : tipo;
}

function AdjuntosBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <Badge
      variant={active ? "secondary" : "outline"}
      className={active ? "gap-1" : "gap-1 text-muted-foreground"}
      title={active ? `${label} presente` : `${label} pendiente`}
    >
      <span>{active ? "✓" : "—"}</span>
      {label}
    </Badge>
  );
}

function ExpedienteCell({ expediente }: { expediente: Expediente }) {
  const codigo = getCodigoExpediente(expediente);
  const descripcion = getDescripcion(expediente);

  return (
    <div className="space-y-1">
      <div className="font-mono text-sm font-semibold text-foreground">
        {codigo || "SIN EXPEDIENTE"}
      </div>
      <div className="line-clamp-2 text-xs text-muted-foreground">
        {descripcion}
      </div>
    </div>
  );
}

function ActionsCell({ expediente }: { expediente: Expediente }) {
  return (
    <div className="flex justify-end gap-1">
      <Button asChild size="icon" variant="outline" title="Ver expediente">
        <Link href={`/compras/${expediente.id}/ver`} aria-label="Ver expediente">
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
      <Button asChild size="icon" variant="outline" title="Editar expediente">
        <Link href={`/compras/${expediente.id}/editar`} aria-label="Editar expediente">
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>
      <Button asChild size="icon" variant="outline" title="Adjuntar documento">
        <Link href={`/compras/${expediente.id}/editar?accion=adjuntar`} aria-label="Adjuntar documento">
          <FilePlus2 className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export function ComprasBandeja() {
  const [empresa, setEmpresa] = useState("BBTI");
  const [estado, setEstado] = useState("abierto");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useExpedientes({
    empresa,
    estado,
    limit: 50,
    offset: 0,
  });

  const expedientes = useMemo(() => normalizeExpedientes(data), [data]);

  const rows = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return expedientes;

    return expedientes.filter((expediente) =>
      [
        getEmpresa(expediente),
        getClienteNombre(expediente),
        getCodigoExpediente(expediente),
        getDescripcion(expediente),
        principalLabel(expediente),
        getEstado(expediente),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value),
    );
  }, [expedientes, search]);

  const metrics = useMemo(() => {
    const abiertos = expedientes.length;
    const conPrincipal = expedientes.filter(
      (expediente) => principalLabel(expediente) !== "Sin principal",
    ).length;

    return { abiertos, conPrincipal };
  }, [expedientes]);

  if (isLoading) {
    return (
      <main className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-10/12" />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600">Error cargando bandeja de compras.</div>;
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-sm text-muted-foreground">
            Bandeja operativa de expedientes, documentos principales y adjuntos.
          </p>
        </div>

        <Button asChild>
          <Link href="/compras/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo expediente
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Expedientes abiertos</div>
            <div className="text-2xl font-bold">{metrics.abiertos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Con documento principal</div>
            <div className="text-2xl font-bold">{metrics.conPrincipal}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <CardTitle>Filtro</CardTitle>
          <div className="grid gap-2 md:grid-cols-[140px_160px_1fr]">
            <select
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              value={empresa}
              onChange={(event) => setEmpresa(event.target.value)}
            >
              <option value="BBTI">BBTI</option>
              <option value="BBTEC">BBTEC</option>
              <option value="CIMA">CIMA</option>
              <option value="HUANCA">HUANCA</option>
              <option value="TARMA">TARMA</option>
              <option value="KIMBIRI">KIMBIRI</option>
            </select>

            <select
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
            >
              <option value="abierto">Abierto</option>
              <option value="en_proceso">En proceso</option>
              <option value="observado">Observado</option>
              <option value="completo">Completo</option>
              <option value="cerrado">Cerrado</option>
            </select>

            <Input
              placeholder="Buscar por expediente, descripción, principal o empresa..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bandeja de compras</CardTitle>
        </CardHeader>

        <CardContent>
          {rows.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">📄</EmptyMedia>
                <EmptyTitle>Sin expedientes</EmptyTitle>
                <EmptyDescription>
                  No se encontraron expedientes con los filtros seleccionados.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">Expediente</th>
                    <th>Empresa</th>
                    <th>Documento principal</th>
                    <th>Adjuntos</th>
                    <th>Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((expediente) => {
                    const tieneFactura = hasDocument(expediente, [
                      "FACTURA",
                      "ADJUNTO_FACTURA",
                      "PRINCIPAL_FACTURA",
                    ]);
                    const tieneGuia = hasDocument(expediente, ["GUIA", "GUÍA"]);

                    return (
                      <tr key={expediente.id} className="border-b align-top hover:bg-muted/30">
                        <td className="w-[32%] py-3 pr-4">
                          <ExpedienteCell expediente={expediente} />
                        </td>
                        <td className="w-[18%] py-3 pr-4">
                          <div className="font-medium">{getEmpresa(expediente)}</div>
                          <div className="line-clamp-1 text-xs text-muted-foreground">
                            {getClienteNombre(expediente)}
                          </div>
                        </td>
                        <td className="w-[24%] py-3 pr-4">
                          <div className="font-medium">{principalLabel(expediente)}</div>
                        </td>
                        <td className="w-[14%] py-3 pr-4">
                          <div className="flex flex-wrap gap-1.5">
                            <AdjuntosBadge label="FAC" active={tieneFactura} />
                            <AdjuntosBadge label="GUÍA" active={tieneGuia} />
                          </div>
                        </td>
                        <td className="w-[8%] py-3 pr-4">
                          <Badge variant="secondary">{getEstado(expediente)}</Badge>
                        </td>
                        <td className="w-[10%] py-3 text-right">
                          <ActionsCell expediente={expediente} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
