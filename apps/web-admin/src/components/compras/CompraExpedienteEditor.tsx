"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, FilePlus2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { OcrValidationModal } from "@/components/ocr/OcrValidationModal";
import { useExpediente } from "@/hooks/useExpedientes";
import {
  procesarArchivoOcr,
  type ProcesarOcrPayload,
  type ProcesarOcrResultado,
} from "@/services/ocr-procesamiento";

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

const ARCHIVO_DEMO_ID = "3788";

const ADJUNTOS_COMPRAS = [
  {
    label: "Factura",
    description: "Comprobante asociado al documento principal.",
    tipoEsperado: "OC",
  },
  {
    label: "Guía",
    description: "Documento de referencia cuando Compras lo tenga disponible.",
    tipoEsperado: "OC",
  },
  {
    label: "Sustento adicional",
    description: "Cotización, correo, orden interna u otro soporte de compras.",
    tipoEsperado: "OC",
  },
] as const;

type AccionCargaDemo = {
  label: string;
  tipoEsperado: string;
  tipoRelacionSugerida: string;
};

function buildResultadoConContexto(
  resultado: ProcesarOcrResultado,
  accion: AccionCargaDemo,
) {
  const metadataOriginal = resultado.metadata;
  const metadata =
    metadataOriginal && typeof metadataOriginal === "object" && !Array.isArray(metadataOriginal)
      ? metadataOriginal
      : {};

  return {
    ...resultado,
    tipoRelacionSugerida: accion.tipoRelacionSugerida,
    contextoCarga: {
      origen: "COMPRAS_EDITAR_MVP",
      accion: accion.label,
      archivoDemoId: ARCHIVO_DEMO_ID,
      tipoEsperado: accion.tipoEsperado,
      tipoRelacionSugerida: accion.tipoRelacionSugerida,
    },
    metadata: {
      ...metadata,
      contextoCarga: {
        origen: "COMPRAS_EDITAR_MVP",
        accion: accion.label,
        archivoDemoId: ARCHIVO_DEMO_ID,
        tipoEsperado: accion.tipoEsperado,
        tipoRelacionSugerida: accion.tipoRelacionSugerida,
      },
    },
  };
}

export function CompraExpedienteEditor({ id }: { id: string | number }) {
  const { data: expediente, isLoading, error } = useExpediente(id);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [resultadoModal, setResultadoModal] = useState<ProcesarOcrResultado | null>(null);
  const [accionActual, setAccionActual] = useState<AccionCargaDemo | null>(null);
  const [mensajeValidacion, setMensajeValidacion] = useState<string | null>(null);

  const procesarDemoMutation = useMutation<
    ProcesarOcrResultado,
    Error,
    AccionCargaDemo
  >({
    mutationFn: async (accion) => {
      const payload: ProcesarOcrPayload = {
        tipoEsperado: accion.tipoEsperado,
        areaOrigen: "COMPRAS",
        canalIngreso: "COMPRAS_EDITAR_MVP",
        reprocesar: true,
      };

      const resultado = await procesarArchivoOcr(ARCHIVO_DEMO_ID, payload);
      return buildResultadoConContexto(resultado, accion);
    },
    onSuccess: (resultado, accion) => {
      setAccionActual(accion);
      setResultadoModal(resultado);
      setMensajeValidacion(null);
      setModalAbierto(true);
    },
    onError: (err, accion) => {
      setAccionActual(accion);
      setMensajeValidacion(
        `No se pudo procesar OCR para ${accion.label}. Revisa Gateway, ms-documentos o el archivo demo ${ARCHIVO_DEMO_ID}. ${err.message}`,
      );
    },
  });

  function iniciarValidacionOcr(accion: AccionCargaDemo) {
    setAccionActual(accion);
    setMensajeValidacion(null);
    procesarDemoMutation.mutate(accion);
  }

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
  const procesando = procesarDemoMutation.isPending;

  return (
    <>
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

        {mensajeValidacion ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            {mensajeValidacion}
          </div>
        ) : null}

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
              <p className="mt-2 text-xs text-muted-foreground">
                MVP: usa archivo demo {ARCHIVO_DEMO_ID} hasta conectar upload real a R2.
              </p>
            </div>
            <Button
              variant="outline"
              disabled={procesando}
              onClick={() =>
                iniciarValidacionOcr({
                  label: "Reemplazar principal",
                  tipoEsperado: "OC",
                  tipoRelacionSugerida: "principal_oc",
                })
              }
            >
              <FilePlus2 className="h-4 w-4" />
              {procesando && accionActual?.label === "Reemplazar principal"
                ? "Procesando..."
                : "Reemplazar principal"}
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
                <Button
                  className="mt-3 w-full"
                  variant="outline"
                  size="sm"
                  disabled={procesando}
                  onClick={() =>
                    iniciarValidacionOcr({
                      label: item.label,
                      tipoEsperado: item.tipoEsperado,
                      tipoRelacionSugerida:
                        item.tipoEsperado === "FACTURA"
                          ? "adjunto_factura"
                          : item.tipoEsperado === "GUIA"
                            ? "adjunto_guia"
                            : "adjunto_otro",
                    })
                  }
                >
                  <FilePlus2 className="h-4 w-4" />
                  {procesando && accionActual?.label === item.label
                    ? "Procesando..."
                    : "Adjuntar"}
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

      <OcrValidationModal
        open={modalAbierto}
        resultado={resultadoModal}
        fallbackArchivoId={ARCHIVO_DEMO_ID}
        onClose={() => setModalAbierto(false)}
        onSave={() => {
          setMensajeValidacion(
            `Cambios OCR guardados localmente para ${accionActual?.label ?? "documento"}. Pendiente conectar guardado real.`,
          );
        }}
        onConfirm={() => {
          setModalAbierto(false);
          setMensajeValidacion(
            `OCR confirmado localmente para ${accionActual?.label ?? "documento"}. Pendiente conectar endpoint de confirmación.`,
          );
        }}
        onReject={() => {
          setModalAbierto(false);
          setMensajeValidacion(
            `OCR rechazado localmente para ${accionActual?.label ?? "documento"}. Pendiente conectar endpoint de rechazo.`,
          );
        }}
      />
    </>
  );
}