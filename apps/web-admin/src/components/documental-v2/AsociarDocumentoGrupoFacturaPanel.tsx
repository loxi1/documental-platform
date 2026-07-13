"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, FileText, Loader2, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  asociarDocumentoGrupoFacturaV2,
  getDocumentosCandidatosGrupoFacturaV2,
} from "@/services/documental-v2-workspace";
import type {
  AsociarDocumentoGrupoFacturaV2Result,
  DocumentoGrupoFacturaCandidatoV2,
} from "@/types/documental-v2-workspace";
import { formatDate, textValue } from "./workspace-v2-utils";

const TIPOS_DOCUMENTOS_GRUPO = [
  { value: "TODOS", label: "Todos" },
  { value: "GUIA_REMISION", label: "Guía de remisión" },
  { value: "NOTA_INGRESO", label: "Nota de ingreso" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "DETRACCION", label: "Detracción" },
] as const;

const ERROR_MESSAGES: Record<string, string> = {
  GRUPO_FACTURA_NO_ENCONTRADO: "El Grupo de Factura ya no está disponible.",
  GRUPO_FACTURA_NO_PERSISTIDO: "Este Grupo de Factura solo está disponible para consulta.",
  GRUPO_FACTURA_NO_ACTIVO: "Este Grupo de Factura no está activo.",
  GRUPO_FACTURA_NO_AUTORIZADO: "No tienes autorización para operar este Grupo de Factura.",
  DOCUMENTO_NO_ENCONTRADO: "El documento seleccionado ya no está disponible.",
  TIPO_DOCUMENTAL_NO_PERMITIDO_EN_GRUPO: "El tipo documental no está permitido para este Grupo de Factura.",
  TIPO_RELACION_NO_PERMITIDO: "El tipo de relación no está permitido.",
  TIPO_RELACION_NO_COINCIDE_CON_DOCUMENTO: "El documento no coincide con el tipo de relación esperado.",
  DOCUMENTO_YA_ASOCIADO_AL_GRUPO_CON_OTRA_RELACION: "El documento ya está asociado a este grupo con otra relación.",
  DOCUMENTO_YA_ASOCIADO_A_OTRO_GRUPO: "El documento ya está asociado a otro Grupo de Factura.",
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

  return extractBackendMessage(payload) ?? "No se pudo asociar el documento al Grupo de Factura.";
}

function candidatoLabel(candidato: DocumentoGrupoFacturaCandidatoV2) {
  return textValue(
    candidato.numeroDocumento
      ? `${candidato.tipoDocumentalLabel ?? "Documento"} ${candidato.numeroDocumento}`
      : candidato.tipoDocumentalLabel,
    "Documento no informado",
  );
}

function CandidatoSummary({ candidato }: { candidato: DocumentoGrupoFacturaCandidatoV2 }) {
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
        <dd className="mt-1 font-medium">{formatDate(candidato.fecha)}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase text-muted-foreground">Relación</dt>
        <dd className="mt-1 font-medium">{textValue(candidato.tipoRelacion)}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase text-muted-foreground">Archivo</dt>
        <dd className="mt-1 truncate font-medium">{textValue(candidato.nombreArchivo, "No informado")}</dd>
      </div>
    </dl>
  );
}

export function AsociarDocumentoGrupoFacturaPanel({
  grupoFacturaId,
  disabled,
  onAssociated,
}: {
  grupoFacturaId?: string | number | null;
  disabled?: boolean;
  onAssociated?: (result: AsociarDocumentoGrupoFacturaV2Result) => Promise<unknown> | unknown;
}) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [tipoDocumental, setTipoDocumental] = useState("TODOS");
  const [selected, setSelected] = useState<DocumentoGrupoFacturaCandidatoV2 | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const normalizedTexto = texto.trim();
  const tipoDocumentalParam = tipoDocumental === "TODOS" ? undefined : tipoDocumental;
  const canQuery = open && Boolean(grupoFacturaId) && (normalizedTexto.length >= 2 || Boolean(tipoDocumentalParam));

  const candidatosQuery = useQuery({
    queryKey: ["documental-v2-candidatos-grupo", grupoFacturaId, tipoDocumentalParam, normalizedTexto],
    queryFn: () =>
      getDocumentosCandidatosGrupoFacturaV2({
        grupoFacturaId: grupoFacturaId ?? "",
        tipoDocumental: tipoDocumentalParam,
        texto: normalizedTexto || undefined,
        pagina: 1,
        limite: 20,
      }),
    enabled: canQuery,
  });

  const candidatos = useMemo(() => candidatosQuery.data ?? [], [candidatosQuery.data]);

  const asociarMutation = useMutation({
    mutationFn: async () => {
      if (!grupoFacturaId || !selected?.documentoId || !selected.tipoRelacion) {
        throw new Error("Falta seleccionar un documento candidato.");
      }

      return asociarDocumentoGrupoFacturaV2({
        grupoFacturaId,
        documentoId: selected.documentoId,
        tipoRelacion: selected.tipoRelacion,
      });
    },
    onSuccess: async (result) => {
      setMessage(
        result.idempotente
          ? "El documento ya estaba asociado al Grupo de Factura."
          : "Documento asociado correctamente al Grupo de Factura.",
      );

      if (result.workspaceDebeRefrescar) {
        await onAssociated?.(result);
        setOpen(false);
      }
    },
  });

  const disabledReason = !grupoFacturaId
    ? "Este Grupo de Factura solo está disponible para consulta."
    : null;

  return (
    <>
      <Button size="sm" disabled={disabled || Boolean(disabledReason)} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Agregar documento
      </Button>
      {disabledReason ? <p className="mt-2 text-xs text-muted-foreground">{disabledReason}</p> : null}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Agregar documento al Grupo de Factura</SheetTitle>
            <SheetDescription>
              Selecciona un documento existente. El tipo de relación viene desde Gateway y no se calcula en frontend.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4">
            <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
              Esta acción no sube archivos, no ejecuta OCR y no modifica el documento original. Solo crea la asociación
              operativa dentro del Grupo de Factura V2.
            </div>

            <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="tipo-documento-grupo">
                  Tipo documental
                </label>
                <Select
                  value={tipoDocumental}
                  onValueChange={(value) => {
                    setTipoDocumental(value);
                    setSelected(null);
                    setMessage(null);
                  }}
                >
                  <SelectTrigger id="tipo-documento-grupo" className="w-full">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOCUMENTOS_GRUPO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="buscar-candidato-grupo">
                  Buscar documento candidato
                </label>
                <div className="flex gap-2">
                  <Input
                    id="buscar-candidato-grupo"
                    value={texto}
                    onChange={(event) => {
                      setTexto(event.target.value);
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
                    const isDisabled = candidato.yaAsociadoGrupoV2 === true;

                    return (
                      <button
                        key={`${String(candidato.documentoId)}-${candidato.tipoRelacion}`}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          setSelected(candidato);
                          setMessage(null);
                        }}
                        className={`w-full rounded-lg border p-3 text-left transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60 ${
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
                              {textValue(candidato.proveedorNombre, "Proveedor no informado")} · {formatDate(candidato.fecha)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{textValue(candidato.tipoDocumentalLabel ?? candidato.tipoDocumental)}</Badge>
                            <Badge variant="secondary">{textValue(candidato.estado, "Sin estado")}</Badge>
                            {isDisabled ? <Badge variant="outline">Ya asociado</Badge> : null}
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
                  Selecciona un tipo documental o escribe al menos 2 caracteres para buscar candidatos.
                </div>
              )}
            </div>

            {selected ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">Resumen antes de confirmar</p>
                <CandidatoSummary candidato={selected} />
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
            <Button disabled={!selected || selected.yaAsociadoGrupoV2 || asociarMutation.isPending} onClick={() => asociarMutation.mutate()}>
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
