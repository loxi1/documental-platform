"use client";

import Link from "next/link";
import { ArrowLeft, FilePlus2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useExpediente } from "@/hooks/useExpedientes";

function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function descripcionAmigable(expediente: any) {
  const descripcion = text(expediente.descripcion, "");
  const descripcionTecnica = descripcion.toLowerCase();

  if (
    descripcion &&
    !descripcionTecnica.includes("expediente documental de prueba") &&
    !descripcionTecnica.includes("expediente creado desde ocr")
  ) {
    return descripcion;
  }

  const codigo = text(expediente.codigo_expediente ?? expediente.codigoExpediente, "");
  const clave = text(expediente.clave_principal ?? expediente.clavePrincipal, "");

  if (clave && !codigo) return "Factura directa";
  if (codigo.startsWith("05")) return "Orden de Producción";
  if (codigo.startsWith("03")) return "Centro de costo";

  return "";
}

const ADJUNTOS_COMPRAS = [
  {
    label: "Factura",
    description: "Comprobante asociado al documento principal.",
  },
  {
    label: "Guía",
    description: "Documento de referencia cuando Compras lo tenga disponible.",
  },
  {
    label: "Sustento adicional",
    description: "Cotización, correo, orden interna u otro soporte de compras.",
  },
];

export function CompraExpedienteEditor({ id }: { id: string | number }) {
  const { data: expediente, isLoading, error } = useExpediente(id);

  if (isLoading) {
    return (
      <main className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (error || !expediente) {
    return <main className="p-6 text-red-600">No se pudo cargar el expediente.</main>;
  }

  const codigo = text(expediente.codigo_expediente ?? expediente.codigoExpediente, "");
  const empresa = text(expediente.empresa_codigo ?? expediente.empresaCodigo, "");
  const clavePrincipal = text(expediente.clave_principal ?? expediente.clavePrincipal, "");

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 px-0">
            <Link href="/compras">
              <ArrowLeft className="h-4 w-4" />
              Volver a compras
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Editar compras</h1>
          <p className="text-sm text-muted-foreground">
            Datos del expediente, documento principal y adjuntos gestionados por Compras.
          </p>
        </div>

        <Button disabled title="Pendiente: PATCH /expedientes/:id">
          <Save className="h-4 w-4" />
          Guardar cambios
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del expediente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Empresa</label>
            <Input value={empresa} readOnly />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Expediente</label>
            <Input value={codigo || "SIN EXPEDIENTE"} readOnly />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Descripción</label>
            <Input defaultValue={descripcionAmigable(expediente)} placeholder="Descripción del expediente" />
          </div>
          {clavePrincipal ? (
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Clave principal</label>
              <Input value={clavePrincipal} readOnly />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documento principal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-medium">Principal del expediente</div>
            <div className="text-sm text-muted-foreground">
              OC, OS o Factura principal. La carga validará OCR antes de guardar.
            </div>
          </div>
          <Button disabled variant="outline" title="Pendiente: modal OCR / carga guiada">
            <FilePlus2 className="h-4 w-4" />
            Reemplazar principal
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adjuntos de Compras</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {ADJUNTOS_COMPRAS.map((item) => (
            <div key={item.label} className="rounded-xl border p-4">
              <div className="font-medium">{item.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {item.description}
              </div>
              <Button className="mt-3 w-full" disabled variant="outline" size="sm">
                <FilePlus2 className="h-4 w-4" />
                Adjuntar
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vista de otras áreas</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nota de ingreso, pagos, detracciones y recibos por honorarios serán gestionados por sus áreas responsables.
          Compras podrá verlos luego en modo consulta dentro del expediente 360°.
        </CardContent>
      </Card>
    </main>
  );
}
