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

type TipoVisual = "OP" | "CENTRO_COSTO" | "GASTO_DIRECTO" | "SIN_CLASIFICAR";

function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function getEmpresa(expediente: Expediente) {
  return text(expediente.empresa_codigo ?? expediente.empresaCodigo, "-");
}

function getCodigoExpediente(expediente: Expediente) {
  return text(expediente.codigo_expediente ?? expediente.codigoExpediente, "");
}

function getClavePrincipal(expediente: Expediente) {
  return text(expediente.clave_principal ?? expediente.clavePrincipal, "");
}

function inferTipoExpediente(expediente: Expediente): TipoVisual {
  const codigo = getCodigoExpediente(expediente);

  if (codigo.startsWith("05")) return "OP";
  if (codigo.startsWith("03")) return "CENTRO_COSTO";
  if (!codigo && getClavePrincipal(expediente)) return "GASTO_DIRECTO";

  const legacyTipo = text(expediente.tipo_expediente ?? expediente.tipoExpediente).toUpperCase();
  if (legacyTipo.includes("GASTO")) return "GASTO_DIRECTO";
  if (legacyTipo.includes("CENTRO")) return "CENTRO_COSTO";
  if (legacyTipo.includes("OP")) return "OP";

  return "SIN_CLASIFICAR";
}

function tipoLabel(tipo: TipoVisual) {
  const labels: Record<TipoVisual, string> = {
    OP: "OP",
    CENTRO_COSTO: "Centro costo",
    GASTO_DIRECTO: "Gasto directo",
    SIN_CLASIFICAR: "Sin clasificar",
  };

  return labels[tipo];
}

function shouldHideDescription(description?: string | null) {
  const value = text(description).toLowerCase();

  if (!value) return true;

  return [
    "expediente documental de prueba",
    "expediente creado desde ocr confirmado",
    "expediente creado desde ocr",
  ].some((technicalText) => value.includes(technicalText));
}

function getDescripcionAmigable(expediente: Expediente) {
  if (!shouldHideDescription(expediente.descripcion)) return expediente.descripcion ?? "";

  const tipo = inferTipoExpediente(expediente);
  if (tipo === "OP") return "Orden de producción / PR";
  if (tipo === "CENTRO_COSTO") return "Centro de costo";
  if (tipo === "GASTO_DIRECTO") return "Factura sin OC/OS";

  return "Pendiente de clasificar";
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

function getPrincipalFromClave(expediente: Expediente) {
  const clave = getClavePrincipal(expediente);
  if (!clave) return "Sin principal";

  const parts = clave.split("|").filter(Boolean);
  const tipo = parts.find((part) => ["FACTURA", "OC", "OS"].includes(part.toUpperCase()));

  if (tipo?.toUpperCase() === "FACTURA") {
    const serie = parts.at(-2);
    const numero = parts.at(-1);
    return serie && numero ? `FACTURA ${serie}-${numero}` : "FACTURA";
  }

  if (tipo?.toUpperCase() === "OC" || tipo?.toUpperCase() === "OS") {
    const numero = parts.at(-1);
    return numero ? `${tipo.toUpperCase()} ${numero}` : tipo.toUpperCase();
  }

  return clave;
}

function principalLabel(expediente: Expediente) {
  const principal = getPrincipal(expediente);

  if (!principal) return getPrincipalFromClave(expediente);

  const tipo = text(principal.tipoDocumental ?? principal.tipoRelacion, "DOC")
    .replace("PRINCIPAL_", "")
    .replace("ADJUNTO_", "")
    .replaceAll("_", " ")
    .toUpperCase();
  const numero = [principal.serie, principal.numero].filter(Boolean).join("-");

  return numero ? `${tipo} ${numero}` : tipo;
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
  const descripcion = getDescripcionAmigable(expediente);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold">
          {codigo || "SIN EXPEDIENTE"}
        </span>
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
        <Link href={`/expedientes/${expediente.id}`} aria-label="Ver expediente">
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        disabled
        size="icon"
        variant="outline"
        title="Editar expediente pendiente de endpoint"
        aria-label="Editar expediente"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        disabled
        size="icon"
        variant="outline"
        title="Adjuntar documento pendiente de carga guiada"
        aria-label="Adjuntar documento"
      >
        <FilePlus2 className="h-4 w-4" />
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

  const rows = useMemo(() => {
    const value = search.trim().toLowerCase();
    const expedientes = data ?? [];

    if (!value) return expedientes;

    return expedientes.filter((expediente) =>
      [
        expediente.correlativo,
        getEmpresa(expediente),
        getCodigoExpediente(expediente),
        tipoLabel(inferTipoExpediente(expediente)),
        expediente.descripcion,
        principalLabel(expediente),
        getClavePrincipal(expediente),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value),
    );
  }, [data, search]);

  const metrics = useMemo(() => {
    const expedientes = data ?? [];
    const abiertos = expedientes.length;
    const conPrincipal = expedientes.filter((expediente) => principalLabel(expediente) !== "Sin principal").length;
    const gastosDirectos = expedientes.filter((expediente) => inferTipoExpediente(expediente) === "GASTO_DIRECTO").length;

    return { abiertos, conPrincipal, gastosDirectos };
  }, [data]);

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
            Bandeja operativa de expedientes, principales y adjuntos.
          </p>
        </div>

        <Button disabled title="Pendiente: POST /expedientes y carga guiada">
          <Plus className="h-4 w-4" />
          Nuevo expediente
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Expedientes abiertos</div>
            <div className="text-2xl font-bold">{metrics.abiertos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Con principal</div>
            <div className="text-2xl font-bold">{metrics.conPrincipal}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Gasto directo</div>
            <div className="text-2xl font-bold">{metrics.gastosDirectos}</div>
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
              placeholder="Buscar por expediente, descripción, principal o proveedor..."
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
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">Expediente</th>
                    <th>Documento principal</th>
                    <th>Adjuntos</th>
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
                    const tieneNi = hasDocument(expediente, [
                      "NOTA_INGRESO",
                      "NOTA INGRESO",
                    ]);
                    const tienePago = hasDocument(expediente, [
                      "PAGO",
                      "TRANSFERENCIA",
                      "DETRACCION",
                      "DETRACCIÓN",
                    ]);

                    return (
                      <tr key={expediente.id} className="border-b align-top hover:bg-muted/30">
                        <td className="w-[38%] py-3 pr-4">
                          <ExpedienteCell expediente={expediente} />
                        </td>
                        <td className="w-[28%] py-3 pr-4">
                          <div className="font-medium">{principalLabel(expediente)}</div>
                        </td>
                        <td className="w-[24%] py-3 pr-4">
                          <div className="flex flex-wrap gap-1.5">
                            <AdjuntosBadge label="FAC" active={tieneFactura} />
                            <AdjuntosBadge label="GUIA" active={tieneGuia} />
                            <AdjuntosBadge label="NI" active={tieneNi} />
                            <AdjuntosBadge label="PAGO" active={tienePago} />
                          </div>
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
