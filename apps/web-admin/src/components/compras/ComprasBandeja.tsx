"use client";

import Link from "next/link";
import { Eye, FilePlus2, Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useExpedientes } from "@/hooks/useExpedientes";
import type { Expediente, ExpedienteDocumento } from "@/types/expediente";
import { useMemo, useState } from "react";

function getEmpresa(expediente: Expediente) {
  return expediente.empresa_codigo ?? expediente.empresaCodigo ?? "-";
}

function getTipo(expediente: Expediente) {
  return expediente.tipo_expediente ?? expediente.tipoExpediente ?? "-";
}

function getCodigo(expediente: Expediente) {
  return (
    expediente.codigo_expediente ??
    expediente.codigoExpediente ??
    expediente.codigo_op ??
    expediente.codigoOp ??
    expediente.codigo_centro_costo ??
    expediente.codigoCentroCosto ??
    expediente.clave_principal ??
    expediente.clavePrincipal ??
    "-"
  );
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

function CheckCell({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="secondary">✓</Badge>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}

function principalLabel(expediente: Expediente) {
  const principal = getPrincipal(expediente);

  if (!principal) return "Sin principal";

  const tipo = principal.tipoDocumental ?? principal.tipoRelacion ?? "DOC";
  const numero = [principal.serie, principal.numero].filter(Boolean).join("-");

  return numero ? `${tipo} ${numero}` : tipo;
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
            Bandeja de documentos principales y adjuntos por expediente.
          </p>
        </div>

        <Button disabled title="Pendiente: POST /expedientes y carga guiada">
          <Plus className="h-4 w-4" />
          Nuevo principal
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
              placeholder="Buscar por código, descripción, principal o proveedor..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bandeja de principales</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Código</th>
                  <th>Tipo</th>
                  <th>Empresa</th>
                  <th>Descripción</th>
                  <th>Principal</th>
                  <th>Factura</th>
                  <th>Guía</th>
                  <th>NI</th>
                  <th>Pago</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((expediente) => (
                  <tr key={expediente.id} className="border-b align-top">
                    <td className="py-3 font-mono text-xs">{getCodigo(expediente)}</td>
                    <td>
                      <Badge variant="outline">{getTipo(expediente)}</Badge>
                    </td>
                    <td>{getEmpresa(expediente)}</td>
                    <td className="max-w-80">
                      <div className="font-medium">{expediente.correlativo}</div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">
                        {expediente.descripcion ?? "Sin descripción"}
                      </div>
                    </td>
                    <td>{principalLabel(expediente)}</td>
                    <td><CheckCell active={hasDocument(expediente, ["FACTURA", "ADJUNTO_FACTURA", "PRINCIPAL_FACTURA"])} /></td>
                    <td><CheckCell active={hasDocument(expediente, ["GUIA", "GUÍA"])} /></td>
                    <td><CheckCell active={hasDocument(expediente, ["NOTA_INGRESO", "NOTA INGRESO"])} /></td>
                    <td><CheckCell active={hasDocument(expediente, ["PAGO", "TRANSFERENCIA", "DETRACCION", "DETRACCIÓN"])} /></td>
                    <td>
                      <Badge variant="secondary">{expediente.estado ?? "abierto"}</Badge>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/expedientes/${expediente.id}`}>
                            <Eye className="h-4 w-4" />
                            Ver
                          </Link>
                        </Button>
                        <Button disabled size="sm" variant="outline" title="Pendiente: PATCH /expedientes/{id}">
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button disabled size="sm" variant="outline" title="Pendiente: carga guiada/vinculación">
                          <FilePlus2 className="h-4 w-4" />
                          Adjuntar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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
