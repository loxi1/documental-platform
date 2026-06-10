"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  FileText,
  RefreshCcw,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCrearDocumentoAlerta } from "@/hooks/useAlertas";
import { useRevisionContable } from "@/hooks/useRevisionContable";
import type { RevisionContableItem } from "@/types/revision-contable";

function pick<T>(...values: T[]) {
  return values.find(
    (value) => value !== null && value !== undefined && value !== "",
  );
}

function expedienteId(item: RevisionContableItem) {
  return pick(item.expediente_id, item.expedienteId, "-");
}

function documentoId(item: RevisionContableItem) {
  return pick(item.documento_id, item.documentoId, "-");
}

function documentoEstado(item: RevisionContableItem) {
  return pick(item.documento_estado, item.documentoEstado, "-");
}

function rucEmisor(item: RevisionContableItem) {
  return pick(item.ruc_emisor, item.rucEmisor, "-");
}

function razonSocial(item: RevisionContableItem) {
  return pick(item.razon_social_emisor, item.razonSocialEmisor, "-");
}

function fechaEmision(item: RevisionContableItem) {
  const value = pick(item.fecha_emision, item.fechaEmision, null);

  if (!value) return "-";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function montoTotal(item: RevisionContableItem) {
  const raw = pick(item.monto_total, item.montoTotal, 0);
  const value = Number(raw ?? 0);

  if (Number.isNaN(value)) {
    return `S/ ${raw}`;
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

function alertasActivas(item: RevisionContableItem) {
  return Number(pick(item.alertas_activas, item.alertasActivas, 0) ?? 0);
}

function documentoNombre(item: RevisionContableItem) {
  const serie = pick(item.serie, "-");
  const numero = pick(item.numero, "-");
  return `${pick(item.tipo_documental, item.tipoDocumental, "DOCUMENTO")} ${serie} ${numero}`;
}

export default function RevisionContablePage() {
  const [empresa, setEmpresa] = useState("BBTI");
  const [anio, setAnio] = useState("2026");
  const [mes, setMes] = useState("1");
  const [observandoId, setObservandoId] = useState<number | string | null>(null);

  const params = useMemo(
    () => ({
      empresa: empresa.trim().toUpperCase(),
      anio,
      mes,
    }),
    [empresa, anio, mes],
  );

  const { data, isLoading, error, refetch, isFetching } =
    useRevisionContable(params);
  const crearAlerta = useCrearDocumentoAlerta();

  const totalFacturas = data?.length ?? 0;
  const totalAlertas =
    data?.reduce((sum, item) => sum + alertasActivas(item), 0) ?? 0;
  const totalMonto =
    data?.reduce((sum, item) => {
      const raw = Number(pick(item.monto_total, item.montoTotal, 0));
      return sum + (Number.isNaN(raw) ? 0 : raw);
    }, 0) ?? 0;

  async function crearObservacion(item: RevisionContableItem) {
    const id = documentoId(item);

    if (id === "-") return;

    setObservandoId(id);

    try {
      await crearAlerta.mutateAsync({
        documentoId: id,
        payload: {
          tipoAlerta: "DOCUMENTO_OBSERVADO",
          mensaje: `Contabilidad observó ${documentoNombre(item)} para revisión.`,
          metadata: {
            origen: "web-admin/revision-contable",
            empresa: params.empresa,
            anio: params.anio,
            mes: params.mes,
          },
        },
      });
      await refetch();
    } finally {
      setObservandoId(null);
    }
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revisión contable</h1>
          <p className="text-sm text-muted-foreground">
            Revisión mensual de facturas confirmadas. El expediente puede vivir
            varios meses; el filtro se basa en el periodo de emisión de factura.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCcw className="mr-1 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                Empresa
              </span>
              <Input
                value={empresa}
                onChange={(event) => setEmpresa(event.target.value)}
                placeholder="BBTI"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                Año
              </span>
              <Input
                value={anio}
                onChange={(event) => setAnio(event.target.value)}
                placeholder="2026"
                inputMode="numeric"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                Mes
              </span>
              <Input
                value={mes}
                onChange={(event) => setMes(event.target.value)}
                placeholder="1"
                inputMode="numeric"
              />
            </label>

            <div className="flex items-end">
              <Button
                className="w-full"
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <Search className="mr-1 h-4 w-4" />
                Consultar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="space-y-0">
            <CardTitle className="text-sm text-muted-foreground">
              Facturas revisadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalFacturas}</div>
            <p className="mt-2 text-xs text-muted-foreground">
              Documentos tipo factura del periodo consultado.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0">
            <CardTitle className="text-sm text-muted-foreground">
              Monto del periodo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Intl.NumberFormat("es-PE", {
                style: "currency",
                currency: "PEN",
                minimumFractionDigits: 2,
              }).format(totalMonto)}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Total calculado desde facturas listadas.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0">
            <CardTitle className="text-sm text-muted-foreground">
              Alertas activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-3xl font-bold">
              {totalAlertas}
              {totalAlertas > 0 ? (
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Alertas pendientes de resolver en los documentos listados.
            </p>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-red-600">
            No se pudo cargar la revisión contable. Verifica backend, empresa,
            año y mes.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facturas del periodo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-sm text-muted-foreground">
              Cargando revisión contable...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">Expediente</th>
                    <th>Documento</th>
                    <th>Proveedor</th>
                    <th>Fecha</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Alertas</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.map((item) => {
                    const expId = expedienteId(item);
                    const docId = documentoId(item);
                    const alertas = alertasActivas(item);

                    return (
                      <tr
                        key={`${expId}-${docId}`}
                        className="border-b align-top"
                      >
                        <td className="py-3">
                          <div className="font-medium">
                            {item.correlativo ?? `Exp. ${expId}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {expId}
                          </div>
                        </td>
                        <td>
                          <div className="font-medium">{documentoNombre(item)}</div>
                          <div className="text-xs text-muted-foreground">
                            ID documento: {docId}
                          </div>
                        </td>
                        <td>
                          <div>{rucEmisor(item)}</div>
                          <div
                            className="max-w-64 truncate text-xs text-muted-foreground"
                            title={String(razonSocial(item))}
                          >
                            {razonSocial(item)}
                          </div>
                        </td>
                        <td>{fechaEmision(item)}</td>
                        <td className="font-medium">{montoTotal(item)}</td>
                        <td>
                          <Badge variant="secondary">
                            {documentoEstado(item)}
                          </Badge>
                          {item.alerta_contable || item.alertaContable ? (
                            <div className="mt-1 text-xs text-amber-700">
                              Observado contable
                            </div>
                          ) : null}
                        </td>
                        <td>
                          {alertas > 0 ? (
                            <Badge variant="destructive">
                              {alertas} activa{alertas === 1 ? "" : "s"}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Sin alertas</Badge>
                          )}
                        </td>
                        <td className="space-x-2 text-right">
                          {expId !== "-" ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/expedientes/${expId}`}>
                                <Eye className="mr-1 h-4 w-4" />
                                Expediente
                              </Link>
                            </Button>
                          ) : null}

                          {docId !== "-" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => crearObservacion(item)}
                              disabled={
                                crearAlerta.isPending && observandoId === docId
                              }
                            >
                              <AlertTriangle className="mr-1 h-4 w-4" />
                              Observar
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!data?.length ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No hay facturas para el periodo consultado.
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
