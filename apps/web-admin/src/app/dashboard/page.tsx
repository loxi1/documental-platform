"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  FileText,
  FolderKanban,
  RefreshCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard, MetricCardSkeleton } from "@/components/documental/metric-card";
import { Input } from "@/components/ui/input";
import { useDashboardContable } from "@/hooks/useDashboard";

function asValue(value: unknown, fallback = "0") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatMoney(value: unknown) {
  const raw = Number(value ?? 0);

  if (Number.isNaN(raw)) {
    return `S/ ${asValue(value, "0.00")}`;
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(raw);
}

export default function DashboardPage() {
  const [empresa, setEmpresa] = useState("BBTI");
  const [anio, setAnio] = useState("2026");
  const [mes, setMes] = useState("1");

  const params = useMemo(
    () => ({
      empresa: empresa.trim().toUpperCase(),
      anio,
      mes,
    }),
    [empresa, anio, mes],
  );

  const { data, isLoading, error, refetch, isFetching } =
    useDashboardContable(params);

  const totales = data?.totales ?? {};

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard contable</h1>
          <p className="text-sm text-muted-foreground">
            Indicadores operativos por empresa, año y mes. El expediente sigue
            siendo la unidad principal del negocio.
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
                Consultar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-red-600">
            No se pudo cargar el dashboard contable. Verifica que el backend esté
            activo y que el endpoint dashboard-contable responda correctamente.
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Expedientes"
            value={asValue(totales.expedientes)}
            description="Expedientes encontrados para el periodo consultado."
            icon={<FolderKanban className="h-5 w-5" />}
            href="/expedientes"
          />

          <MetricCard
            title="Facturas"
            value={asValue(totales.facturas)}
            description="Facturas consideradas en la revisión contable."
            icon={<FileText className="h-5 w-5" />}
            href="/revision-contable"
          />

          <MetricCard
            title="Monto facturado"
            value={formatMoney(totales.montoFacturado)}
            description="Total facturado del mes según documentos confirmados."
            icon={<Banknote className="h-5 w-5" />}
          />

          <MetricCard
            title="Alertas activas"
            value={asValue(totales.alertasActivas)}
            description="Alertas operativas pendientes de resolver."
            icon={<AlertTriangle className="h-5 w-5" />}
            href="/alertas"
            accent={Number(totales.alertasActivas ?? 0) > 0 ? "warning" : "success"}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Acciones rápidas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/expedientes">Ver expedientes</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/revision-contable">Revisión contable</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/ocr-resultados">OCR resultados</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Periodo consultado</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm md:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">Empresa</div>
              <div className="font-medium">{data?.empresa ?? params.empresa}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Año</div>
              <div className="font-medium">{data?.anio ?? params.anio}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Mes</div>
              <div className="font-medium">{data?.mes ?? params.mes}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
