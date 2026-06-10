"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clipboard, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumento } from "@/hooks/useDocumentos";
import type { Documento } from "@/types/documento";

function value(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function get(documento: Documento | undefined, snake: keyof Documento, camel?: keyof Documento) {
  if (!documento) return "-";
  return value(documento[snake] ?? (camel ? documento[camel] : undefined));
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getExpedienteId(documento?: Documento) {
  return documento?.expediente_id ?? documento?.expedienteId ?? null;
}

function getClave(documento?: Documento) {
  return value(documento?.clave_documental ?? documento?.claveDocumental);
}

function getEmpresa(documento?: Documento) {
  return value(documento?.cliente_abreviatura ?? documento?.clienteAbreviatura);
}

function isClaveNueva(documento?: Documento) {
  const clave = getClave(documento);
  const empresa = getEmpresa(documento);
  return empresa !== "-" && clave.startsWith(`${empresa}|`);
}

export default function DocumentoDetallePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, isLoading, error } = useDocumento(id);

  async function copyClave() {
    const clave = getClave(data);
    if (!clave || clave === "-") return;
    await navigator.clipboard.writeText(clave);
  }

  const expedienteId = getExpedienteId(data);

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-2 px-0">
            <Link href="/documentos">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver a documentos
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Documento #{id}</h1>
          <p className="text-sm text-muted-foreground">
            Detalle simple basado en GET /documentos/:id. Cuando exista el endpoint enriquecido se agregará expediente, archivos y alertas completas.
          </p>
        </div>

        {expedienteId ? (
          <Button asChild>
            <Link href={`/expedientes/${expedienteId}`}>Ver expediente</Link>
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-10/12" />
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText className="h-5 w-5" />
            </EmptyMedia>
            <EmptyTitle>No se pudo cargar el documento</EmptyTitle>
            <EmptyDescription>
              Si GET /documentos/:id todavía no existe en backend, esta pantalla quedará lista para activarse cuando se implemente.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {data ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Datos documentales
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Tipo documental</div>
                <Badge variant="secondary">{get(data, "tipo_documental", "tipoDocumental")}</Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Estado</div>
                <Badge variant="outline">{get(data, "estado")}</Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Empresa</div>
                <div className="font-medium">{getEmpresa(data)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">RUC emisor</div>
                <div className="font-mono text-sm">{get(data, "ruc_emisor", "rucEmisor")}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground">Razón social</div>
                <div className="font-medium">{get(data, "razon_social_emisor", "razonSocialEmisor")}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Serie</div>
                <div className="font-medium">{get(data, "serie")}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Número</div>
                <div className="font-medium">{get(data, "numero")}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Año</div>
                <div>{get(data, "periodo_anio", "anio")}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Mes</div>
                <div>{get(data, "periodo_mes", "mes")}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fecha emisión / creación</div>
                <div>{formatDate(data.fecha_emision ?? data.fechaEmision ?? data.creado_en ?? data.creadoEn)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clave y vínculos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground">Clave documental</div>
                <div className="mt-1 break-all rounded-lg border bg-muted/30 p-3 font-mono text-xs">
                  {getClave(data)}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={copyClave}>
                    <Clipboard className="mr-1 h-3.5 w-3.5" />
                    Copiar clave
                  </Button>
                  {isClaveNueva(data) ? (
                    <Badge variant="secondary">Formato oficial</Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600">
                      Formato histórico
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Expediente</div>
                {expedienteId ? (
                  <Button asChild variant="outline" className="mt-1">
                    <Link href={`/expedientes/${expedienteId}`}>
                      {value(data.expediente_correlativo ?? data.expedienteCorrelativo, `Expediente #${expedienteId}`)}
                    </Link>
                  </Button>
                ) : (
                  <div className="mt-1 text-sm text-muted-foreground">
                    No disponible en el endpoint actual.
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Alertas</div>
                <Button asChild variant="outline" className="mt-1">
                  <Link href={`/alertas?documentoId=${data.id}`}>Ver alertas del documento</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
