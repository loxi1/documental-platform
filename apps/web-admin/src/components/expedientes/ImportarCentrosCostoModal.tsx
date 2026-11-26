"use client";

import { useRef, useState } from "react";
import { Upload, X, FileSpreadsheet, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { getAuthSession } from "@/lib/auth-storage";
import {
  EXPEDIENTES_CSV_LIMITS,
  ExpedientesCsvError,
  parseExpedientesCsv,
  type ExpedientesCsvResult,
} from "@/lib/expedientes-csv.parser";

import {
  importarExpedientesCsv,
  mismaSesionImportacion,
  type ExpedientesImportacionResultado,
} from "@/services/expedientes-mantenimiento";

import type { AuthSession } from "@/types/auth";

type Props = {
  sesion: AuthSession;
  empresaNombre: string;
  onClose: () => void;
  onCompleted: () => Promise<void>;
};

type Seleccion = {
  archivo: File;
  solicitudId: string;
  preview: ExpedientesCsvResult;
};

function mensajeError(error: unknown): string {
  if (error instanceof ExpedientesCsvError) {
    return error.row
      ? `Fila ${error.row}: ${error.message}`
      : error.message;
  }

  const response = (
    error as {
      response?: {
        data?: {
          message?: string | string[];
          error?: { message?: string };
        };
      };
    }
  )?.response?.data;

  const message = response?.message ?? response?.error?.message;

  if (Array.isArray(message)) return message.join(". ");
  if (typeof message === "string") return message;
  if (error instanceof Error) return error.message;

  return "No se pudo completar la operación.";
}

export function ImportarCentrosCostoModal({
  sesion,
  empresaNombre,
  onClose,
  onCompleted,
}: Props) {
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [resultado, setResultado] =
    useState<ExpedientesImportacionResultado | null>(null);

  const ocupado = useRef(false);

  const contexto = sesion.contexto;

  const contextoValido =
    Boolean(sesion.accessToken) &&
    Number.isSafeInteger(contexto.sub) &&
    contexto.sub > 0 &&
    Number.isSafeInteger(contexto.workspaceId) &&
    contexto.workspaceId > 0 &&
    Number.isSafeInteger(Number(contexto.clienteDestinoId)) &&
    Number(contexto.clienteDestinoId) > 0 &&
    Boolean(contexto.sessionContextId) &&
    /^[A-Z0-9_-]{1,20}$/.test(contexto.empresa) &&
    ["admin", "compras", "contabilidad"].includes(
      contexto.perfil.toLowerCase(),
    );

  function cerrar() {
    if (ocupado.current) return;
    onClose();
  }

  async function cargarCsv(archivo: File) {
    if (ocupado.current || resultado) return;

    ocupado.current = true;
    setLeyendo(true);
    setSeleccion(null);
    setError(null);
    setAviso(null);

    try {
      if (!contextoValido) {
        throw new Error("El contexto empresarial no es válido.");
      }

      if (!mismaSesionImportacion(sesion, getAuthSession())) {
        throw new Error(
          "La sesión cambió. Cierre el modal y vuelva a abrirlo.",
        );
      }

      if (!/\.csv$/i.test(archivo.name)) {
        throw new Error("Seleccione un archivo CSV.");
      }

      if (archivo.size > EXPEDIENTES_CSV_LIMITS.maxBytes) {
        throw new Error("El archivo supera el límite de 2 MiB.");
      }

      const bytes = new Uint8Array(await archivo.arrayBuffer());
      const preview = parseExpedientesCsv(bytes);

      if (!mismaSesionImportacion(sesion, getAuthSession())) {
        throw new Error(
          "La sesión cambió. Cierre el modal y vuelva a abrirlo.",
        );
      }

      setSeleccion({
        archivo,
        solicitudId: crypto.randomUUID(),
        preview,
      });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      ocupado.current = false;
      setLeyendo(false);
    }
  }

  async function confirmar() {
    if (
      ocupado.current ||
      !seleccion ||
      !contextoValido ||
      resultado
    ) return;

    ocupado.current = true;
    setConfirmando(true);
    setError(null);
    setAviso(null);

    try {
      const respuesta = await importarExpedientesCsv(
        seleccion.archivo,
        seleccion.solicitudId,
        sesion,
      );

      if (
        respuesta.estado !== "confirmada" ||
        respuesta.solicitudId !== seleccion.solicitudId ||
        respuesta.empresaCodigo !== contexto.empresa ||
        respuesta.clienteDestinoId !== Number(contexto.clienteDestinoId)
      ) {
        throw new Error(
          "La respuesta no acredita la confirmación de esta importación.",
        );
      }

      setResultado(respuesta);

      if (!mismaSesionImportacion(sesion, getAuthSession())) {
        setAviso(
          "La importación fue confirmada en la empresa original. " +
          "La sesión activa cambió.",
        );
        return;
      }

      try {
        await onCompleted();
      } catch {
        setAviso(
          "La importación fue confirmada. Actualice la bandeja manualmente.",
        );
      }
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      ocupado.current = false;
      setConfirmando(false);
    }
  }

  const procesando = leyendo || confirmando;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="importar-centros-costo-titulo"
        className="flex max-h-[94vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
          <div>
            <h2
              id="importar-centros-costo-titulo"
              className="text-lg font-semibold"
            >
              Importar centros de costo
            </h2>
            <p className="text-sm text-muted-foreground">
              Importación incremental mediante archivo CSV
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={procesando}
            onClick={cerrar}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.75fr)]">

          <section className="flex min-h-0 min-w-0 flex-col gap-4">
            <div>
              <label
                htmlFor="centros-costo-csv"
                className="mb-2 block text-sm font-medium"
              >
                Archivo CSV
              </label>

              <Input
                id="centros-costo-csv"
                type="file"
                accept=".csv,text/csv"
                disabled={
                  procesando || Boolean(resultado) || !contextoValido
                }
                onChange={(event) => {
                  const archivo = event.target.files?.[0];
                  event.target.value = "";
                  if (archivo) void cargarCsv(archivo);
                }}
              />
            </div>

            {seleccion ? (
              <>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <FileSpreadsheet className="h-5 w-5 shrink-0 text-muted-foreground" />

                  <div className="min-w-0">
                    <p className="break-all text-sm font-medium">
                      {seleccion.archivo.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {seleccion.preview.totalRegistros} registros
                      {" · "}
                      {seleccion.preview.rows.length} códigos únicos
                    </p>
                  </div>
                </div>

                <div className="max-h-[50vh] overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descripción</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {seleccion.preview.rows.map((row) => (
                        <TableRow key={row.codigo_expediente}>
                          <TableCell className="whitespace-nowrap font-medium">
                            {row.codigo_expediente}
                          </TableCell>

                          <TableCell className="whitespace-pre-wrap break-words">
                            {row.descripcion}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center">
                <Upload className="h-9 w-9 text-muted-foreground" />

                <p className="text-sm font-medium">
                  {leyendo
                    ? "Leyendo archivo CSV..."
                    : "Seleccione un archivo CSV"}
                </p>

                <p className="text-xs text-muted-foreground">
                  codigo_expediente, descripcion
                </p>
              </div>
            )}
          </section>

          <section className="min-w-0 space-y-4">
            <div className="rounded-xl border p-4">
              <h3 className="mb-3 text-sm font-semibold">
                Empresa destinataria
              </h3>

              <p className="break-words font-medium">
                {empresaNombre || contexto.empresa}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Código: {contexto.empresa}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Contexto autenticado · Solo lectura
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-xl border p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />

              <p className="text-sm">
                Se incorporarán los centros de costo nuevos y se actualizarán
                únicamente las descripciones que hayan cambiado.
                Los centros de costo anulados permanecerán intactos.
                El archivo original se conservará como evidencia.
              </p>
            </div>

            {!contextoValido && (
              <p role="alert" className="text-sm text-destructive">
                El contexto empresarial no permite esta importación.
              </p>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            {aviso && (
              <p role="status" className="text-sm text-muted-foreground">
                {aviso}
              </p>
            )}

            {resultado && (
              <div
                role="status"
                className="space-y-3 rounded-xl border p-4"
              >
                <h3 className="font-semibold">
                  Importación confirmada
                </h3>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Total CSV", resultado.totalRegistros],
                    ["Nuevos", resultado.registrosInsertados],
                    ["Sin cambios", resultado.registrosExistentes],
                    ["Duplicados CSV", resultado.registrosDuplicadosCsv],
                    ["Modificados", resultado.registrosModificados],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="text-xl font-semibold">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <p className="text-xs text-muted-foreground">
                  {resultado.nasEstado === "verificado"
                    ? "Archivo verificado en NAS."
                    : "Archivo conservado en R2. NAS pendiente."}
                </p>
              </div>
            )}
          </section>
        </div>

        <footer className="flex flex-wrap justify-end gap-3 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={procesando}
            onClick={cerrar}
          >
            {resultado ? "Cerrar" : "Cancelar"}
          </Button>

          {!resultado && (
            <Button
              type="button"
              disabled={
                procesando || !seleccion || !contextoValido
              }
              onClick={() => void confirmar()}
            >
              {confirmando
                ? "Importando..."
                : "Confirmar importación"}
            </Button>
          )}
        </footer>
      </section>
    </div>
  );
}
