"use client";

import Link from "next/link";
import { Eye, FilePlus2, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useExpedientes } from "@/hooks/useExpedientes";
import type { Expediente, ExpedienteDocumento } from "@/types/expediente";

const ADJUNTOS = [
  {
    label: "Factura",
    short: "FAC",
    aliases: ["FACTURA", "ADJUNTO_FACTURA", "PRINCIPAL_FACTURA"],
  },
  {
    label: "Guía",
    short: "GUIA",
    aliases: ["GUIA", "GUÍA", "GUIA_REMISION", "GUÍA_REMISIÓN"],
  },
  {
    label: "Nota de ingreso",
    short: "NI",
    aliases: ["NOTA_INGRESO", "NOTA INGRESO", "NI"],
  },
  {
    label: "Pago",
    short: "PAGO",
    aliases: ["PAGO", "TRANSFERENCIA", "DETRACCION", "DETRACCIÓN"],
  },
];

function getEmpresa(expediente: Expediente) {
  return expediente.empresa_codigo ?? expediente.empresaCodigo ?? "-";
}

function getTipo(expediente: Expediente) {
  return expediente.tipo_expediente ?? expediente.tipoExpediente ?? "-";
}

function formatTipo(tipo: string) {
  if (tipo === "CENTRO_COSTO") return "Centro costo";
  if (tipo === "GASTO_DIRECTO") return "Gasto directo";
  return tipo;
}

function getCodigo(expediente: Expediente) {
  return expediente.codigo_expediente ?? expediente.codigoExpediente ?? "";
}

function getPrincipal(expediente: Expediente): ExpedienteDocumento | null {
  if (expediente.documentoPrincipal) return expediente.documentoPrincipal;

  return (
    expediente.documentos?.find((documento) => documento.esPrincipal) ??
    expediente.documentosAdjuntos?.find((documento) => documento.esPrincipal) ??
    null
  );
}

function getAllDocuments(expediente: Expediente) {
  return [
    ...(expediente.documentos ?? []),
    ...(expediente.documentoPrincipal ? [expediente.documentoPrincipal] : []),
    ...(expediente.documentosAdjuntos ?? []),
  ];
}

function hasDocument(expediente: Expediente, aliases: string[]) {
  const normalizedAliases = aliases.map((alias) => alias.toUpperCase());

  return getAllDocuments(expediente).some((documento) => {
    const tipo = String(documento.tipoDocumental ?? "").toUpperCase();
    const relacion = String(documento.tipoRelacion ?? "").toUpperCase();

    return normalizedAliases.some(
      (alias) => tipo.includes(alias) || relacion.includes(alias),
    );
  });
}

function parseClavePrincipal(clave?: string | null) {
  if (!clave) return null;

  const parts = clave.split("|").map((part) => part.trim()).filter(Boolean);
  const tipo = parts[1] ?? parts[0] ?? "Documento";
  const serie = parts.length >= 5 ? parts[3] : null;
  const numero = parts.length >= 5 ? parts[4] : parts.at(-1) ?? null;

  if (tipo.toUpperCase() === "FACTURA" && serie && numero) {
    return `FACTURA ${serie}-${numero}`;
  }

  if (numero) return `${tipo} ${numero}`;

  return tipo;
}

function principalLabel(expediente: Expediente) {
  const principal = getPrincipal(expediente);

  if (principal) {
    const tipo = String(principal.tipoDocumental ?? principal.tipoRelacion ?? "DOC")
      .replace(/^principal_/i, "")
      .replace(/^adjunto_/i, "")
      .replaceAll("_", " ")
      .toUpperCase();
    const numero = [principal.serie, principal.numero].filter(Boolean).join("-");

    return numero ? `${tipo} ${numero}` : tipo;
  }

  return parseClavePrincipal(expediente.clave_principal ?? expediente.clavePrincipal) ?? "Sin principal";
}

function AdjuntoPill({ active, label, short }: { active: boolean; label: string; short: string }) {
  return (
    <span
      title={label}
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-500",
      ].join(" ")}
    >
      <span>{active ? "✓" : "—"}</span>
      {short}
    </span>
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

  const rows = useMemo(() => {
    const value = search.trim().toLowerCase();
    const expedientes = data ?? [];

    if (!value) return expedientes;

    return expedientes.filter((expediente) =>
      [
        expediente.correlativo,
        getEmpresa(expediente),
        getTipo(expediente),
        getCodigo(expediente),
        expediente.descripcion,
        principalLabel(expediente),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value),
    );
  }, [data, search]);

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
            Bandeja operativa de principales y adjuntos por expediente.
          </p>
        </div>

        <Button disabled title="Pendiente: POST /expedientes y carga guiada">
          <Plus className="h-4 w-4" />
          Nuevo expediente
        </Button>
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
              placeholder="Buscar por código, tipo, principal o descripción..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Bandeja de compras</CardTitle>
          <span className="text-xs text-muted-foreground">{rows.length} registros</span>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="w-[180px] py-2">Código expediente</th>
                  <th className="w-[140px]">Tipo</th>
                  <th>Documento principal</th>
                  <th className="w-[300px]">Adjuntos</th>
                  <th className="w-[130px] text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((expediente) => {
                  const codigo = getCodigo(expediente);
                  const tipo = getTipo(expediente);

                  return (
                    <tr key={expediente.id} className="border-b align-top hover:bg-muted/30">
                      <td className="py-3">
                        <div className="font-mono text-sm font-semibold">
                          {codigo || "—"}
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {expediente.descripcion ?? expediente.correlativo ?? "Sin descripción"}
                        </div>
                      </td>

                      <td className="py-3">
                        <Badge variant="outline">{formatTipo(tipo)}</Badge>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {getEmpresa(expediente)}
                        </div>
                      </td>

                      <td className="py-3">
                        <div className="font-medium">{principalLabel(expediente)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {expediente.correlativo}
                        </div>
                      </td>

                      <td className="py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {ADJUNTOS.map((adjunto) => (
                            <AdjuntoPill
                              key={adjunto.short}
                              active={hasDocument(expediente, adjunto.aliases)}
                              label={adjunto.label}
                              short={adjunto.short}
                            />
                          ))}
                        </div>
                      </td>

                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild size="sm" variant="outline" className="h-8 w-8 p-0" title="Ver expediente">
                            <Link href={`/expedientes/${expediente.id}`} aria-label="Ver expediente">
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button disabled size="sm" variant="outline" className="h-8 w-8 p-0" title="Editar expediente">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button disabled size="sm" variant="outline" className="h-8 w-8 p-0" title="Adjuntar documento">
                            <FilePlus2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!rows.length && (
              <Empty className="mt-4">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FilePlus2 className="h-5 w-5" />
                  </EmptyMedia>
                  <EmptyTitle>Sin expedientes para compras</EmptyTitle>
                  <EmptyDescription>
                    Cuando existan documentos principales o expedientes, aparecerán en esta bandeja.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
