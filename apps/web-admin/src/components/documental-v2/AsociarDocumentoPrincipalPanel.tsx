"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, FileText, Loader2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  asociarDocumentoPrincipalV2,
  getDocumentosCandidatosPrincipal,
} from "@/services/documental-v2-workspace";
import type { AsociarDocumentoPrincipalV2Result, DocumentoPrincipalCandidato } from "@/types/documental-v2-workspace";
import { formatDate, formatMoney, textValue } from "./workspace-v2-utils";

const ERROR_MESSAGES: Record<string, string> = {
  CONTEXTO_OPERATIVO_NO_ENCONTRADO: "El contexto operativo no existe o ya no está disponible.",
  CONTEXTO_OPERATIVO_INACTIVO: "El contexto operativo no está activo y no permite asociar documentos.",
  CONTEXTO_OPERATIVO_NO_AUTORIZADO: "No tienes permisos para operar sobre este contexto.",
  DOCUMENTO_NO_ENCONTRADO: "El documento seleccionado no existe o ya no está disponible.",
  TIPO_DOCUMENTAL_NO_PERMITIDO: "Este tipo documental no puede usarse como Documento Operativo Principal.",
  TIPO_PRINCIPAL_NO_COINCIDE_CON_DOCUMENTO:
    "El tipo principal seleccionado no coincide con el tipo documental del documento.",
  DOCUMENTO_YA_ES_PRINCIPAL_EN_OTRO_CONTEXTO:
    "Este documento ya está asociado como Documento Operativo Principal en otro contexto.",
  DOCUMENTO_PRINCIPAL_YA_ASOCIADO_CON_OTRO_TIPO:
    "Este documento ya está asociado como principal con otro tipo documental.",
  SIN_PERMISO_ASOCIAR_DOCUMENTO_PRINCIPAL: "No tienes permisos para asociar documentos principales en este workspace.",
  ERROR_ASOCIAR_DOCUMENTO_PRINCIPAL: "No se pudo asociar el documento principal. Intenta nuevamente.",
};

function extractFunctionalErrorCode(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : null;

  if (code && ERROR_MESSAGES[code]) {
    return code;
  }

  return (
    extractFunctionalErrorCode(record.details) ??
    extractFunctionalErrorCode(record.error) ??
    extractFunctionalErrorCode(record.upstream) ??
    code
  );
}

function extractErrorPayload(error: unknown): unknown {
  if (!error || typeof error !== "object") return error;

  if ("response" in error) {
    return (error as { response?: { data?: unknown } }).response?.data ?? error;
  }

  return error;
}

function extractBackendMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }

  return (
    extractBackendMessage(record.details) ??
    extractBackendMessage(record.error) ??
    extractBackendMessage(record.upstream)
  );
}

function getErrorMessage(error: unknown) {
  const payload = extractErrorPayload(error);
  const code = extractFunctionalErrorCode(payload);

  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  return extractBackendMessage(payload) ?? "No se pudo asociar el documento principal.";
}

function candidatoLabel(candidato: DocumentoPrincipalCandidato) {
  return textValue(candidato.titulo ?? candidato.numeroDocumento, "Documento no informado");
}

function CandidatoSummary({ candidato }: { candidato: DocumentoPrincipalCandidato }) {
  return (
    <dl className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs font-medium uppercase text-muted-foreground">Documento</dt>
        <dd className="mt-1 font-medium">{candidatoLabel(candidato)}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase text-muted-foreground">Tipo</dt>
        <dd className="mt-1 font-medium">{textValue(candidato.tipoDocumentalLabel ?? candidato.tipoDocumental)}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase text-muted-foreground">Proveedor</dt>
        <dd className="mt-1 font-medium">{textValue(candidato.proveedorNombre, "No informado")}</dd>
        <dd className="text-xs text-muted-foreground">RUC: {textValue(candidato.proveedorRuc, "No informado")}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase text-muted-foreground">Fecha</dt>
        <dd className="mt-1 font-medium">{formatDate(candidato.fechaEmision)}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase text-muted-foreground">Monto</dt>
        <dd className="mt-1 font-medium">{formatMoney(candidato.montoTotal, candidato.moneda)}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase text-muted-foreground">Archivo</dt>
        <dd className="mt-1 truncate font-medium">{textValue(candidato.nombreArchivo, "No informado")}</dd>
      </div>
    </dl>
  );
}

export function AsociarDocumentoPrincipalPanel({
  contenedorOperativoId,
  empresaCodigo,
  disabled,
  onAssociated,
}: {
  contenedorOperativoId?: string | number | null;
  empresaCodigo?: string | null;
  disabled?: boolean;
  onAssociated?: (result: AsociarDocumentoPrincipalV2Result) => Promise<unknown> | unknown;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("900002");
  const [selected, setSelected] = useState<DocumentoPrincipalCandidato | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canQuery = open && Boolean(empresaCodigo) && q.trim().length >= 2;

  const candidatosQuery = useQuery({
    queryKey: ["documental-v2-candidatos-principal", empresaCodigo, q],
    queryFn: () =>
      getDocumentosCandidatosPrincipal({
        empresaCodigo: empresaCodigo ?? "",
        tipoPrincipal: "OC",
        q: q.trim(),
        limit: 20,
      }),
    enabled: canQuery,
  });

  const candidatos = useMemo(() => candidatosQuery.data ?? [], [candidatosQuery.data]);

  const asociarMutation = useMutation({
    mutationFn: async () => {
      if (!contenedorOperativoId || !selected?.documentoId) {
        throw new Error("Falta seleccionar un documento candidato.");
      }

      return asociarDocumentoPrincipalV2({
        contenedorOperativoId,
        documentoId: selected.documentoId,
        tipoPrincipal: "OC",
      });
    },
    onSuccess: async (result) => {
      setMessage(
        result.idempotente
          ? "El documento ya estaba asociado como principal."
          : "Documento principal asociado correctamente.",
      );

      if (result.workspaceDebeRefrescar) {
        await onAssociated?.(result);
        setOpen(false);
      }
    },
  });

  const disabledReason = !contenedorOperativoId
    ? "Este contexto aún no está habilitado para operación V2."
    : !empresaCodigo
      ? "El Workspace no expone empresaCodigo para buscar candidatos."
      : null;


  return (
    <>
      <Button disabled={disabled || Boolean(disabledReason)} onClick={() => setOpen(true)}>
        Asociar documento principal
      </Button>
      {disabledReason ? <p className="mt-2 text-xs text-muted-foreground">{disabledReason}</p> : null}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Asociar documento principal</SheetTitle>
            <SheetDescription>
              Selecciona una OC existente para asociarla como Documento Operativo Principal de este contexto.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4">
            <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
              Esta acción no sube archivos, no ejecuta OCR y no modifica el documento original. Solo crea la relación
              operativa V2.
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="buscar-candidato-principal">
                Buscar OC candidata
              </label>
              <div className="flex gap-2">
                <Input
                  id="buscar-candidato-principal"
                  value={q}
                  onChange={(event) => {
                    setQ(event.target.value);
                    setSelected(null);
                    setMessage(null);
                  }}
                  placeholder="Número, proveedor o referencia"
                />
                <Button variant="outline" disabled={candidatosQuery.isFetching || !canQuery}>
                  {candidatosQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Buscar
                </Button>
              </div>
            </div>

            {candidatosQuery.isError ? (
              <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                No se pudieron cargar los documentos candidatos.
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Candidatos</p>
              {candidatosQuery.isFetching ? (
                <div className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando candidatos...
                </div>
              ) : candidatos.length ? (
                <div className="space-y-2">
                  {candidatos.map((candidato) => {
                    const isSelected = selected?.documentoId === candidato.documentoId;
                    return (
                      <button
                        key={String(candidato.documentoId)}
                        type="button"
                        onClick={() => {
                          setSelected(candidato);
                          setMessage(null);
                        }}
                        className={`w-full rounded-lg border p-3 text-left transition hover:bg-muted/40 ${
                          isSelected ? "border-primary bg-primary/5" : "bg-background"
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <p className="truncate font-medium">{candidatoLabel(candidato)}</p>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {textValue(candidato.proveedorNombre, "Proveedor no informado")} · {formatDate(candidato.fechaEmision)} · {formatMoney(candidato.montoTotal, candidato.moneda)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{textValue(candidato.estado, "Sin estado")}</Badge>
                            {candidato.yaEsPrincipalV2 ? <Badge variant="outline">Ya principal V2</Badge> : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : canQuery ? (
                <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  No se encontraron documentos candidatos con ese criterio.
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  Escribe al menos 2 caracteres para buscar candidatos.
                </div>
              )}
            </div>

            {selected ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">Resumen antes de confirmar</p>
                <CandidatoSummary candidato={selected} />
                {selected.yaEsPrincipalV2 ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                    Este documento ya aparece asociado como principal V2. Si corresponde al mismo contexto, el backend responderá como operación idempotente.
                  </div>
                ) : null}
              </div>
            ) : null}

            {message ? (
              <div className="flex gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4" />
                {message}
              </div>
            ) : null}

            {asociarMutation.isError ? (
              <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                {getErrorMessage(asociarMutation.error)}
              </div>
            ) : null}
          </div>

          <SheetFooter>
            <Button
              disabled={!selected || asociarMutation.isPending}
              onClick={() => asociarMutation.mutate()}
            >
              {asociarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirmar asociación
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
