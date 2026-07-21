"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  CargaSeguraUxResult,
  CargaSeguraUxState,
  SecureUploadIntent,
} from "@/types/documental-v2-carga-segura";
import { secureUploadContextFixture } from "./fixtures/carga-documental-segura.fixtures";
import { createSecureUploadIntent } from "./carga-segura-intent";
import {
  type CargaSeguraMockScenario,
  simulateSecureDocumentUpload,
} from "./mocks/carga-documental-segura.mock-client";
import { CargaDocumentalAcciones } from "./CargaDocumentalAcciones";
import { CargaDocumentalDropzone } from "./CargaDocumentalDropzone";
import { CargaDocumentalEstado } from "./CargaDocumentalEstado";
import { CargaDocumentalMensajes } from "./CargaDocumentalMensajes";
import { CargaDocumentalResumenArchivo } from "./CargaDocumentalResumenArchivo";

const SCENARIOS: { value: CargaSeguraMockScenario; label: string }[] = [
  { value: "created", label: "CREATED" },
  { value: "replayed", label: "REPLAYED" },
  { value: "duplicate", label: "DUPLICATE" },
  { value: "idempotencyConflict", label: "IDEMPOTENCY_CONFLICT" },
  { value: "operationInProgress", label: "OPERATION_IN_PROGRESS" },
  { value: "reconciliationRequired", label: "RECONCILIATION_REQUIRED" },
  { value: "featureDisabled", label: "FEATURE_DISABLED" },
  { value: "dependencyUnavailable", label: "DEPENDENCY_UNAVAILABLE" },
  { value: "validationError", label: "VALIDATION_ERROR" },
  { value: "unknownError", label: "UNKNOWN_ERROR" },
];

export function CargaDocumentalSeguraPanel() {
  const context = useMemo(() => secureUploadContextFixture, []);
  const [intent, setIntent] = useState<SecureUploadIntent | null>(null);
  const [result, setResult] = useState<CargaSeguraUxResult | null>(null);
  const [state, setState] = useState<CargaSeguraUxState>("idle");
  const [scenario, setScenario] = useState<CargaSeguraMockScenario>("created");
  const [processing, setProcessing] = useState(false);

  function handleFileAccepted(file: File) {
    setIntent(createSecureUploadIntent(file, context));
    setResult(null);
    setState("file_selected");
  }

  function handleRejected(reason: "payload_too_large" | "unsupported_media") {
    setIntent(null);
    setResult({
      state: reason,
      title: reason === "payload_too_large" ? "Archivo demasiado grande" : "Tipo de archivo no permitido",
      message:
        reason === "payload_too_large"
          ? "El archivo supera el límite permitido de 15 MiB."
          : "Solo se permite PDF, JPEG o PNG de forma orientativa. El backend realizará la validación definitiva.",
      retryPolicy: "none",
    });
    setState(reason);
  }

  async function executeSimulation() {
    if (!intent) return;

    setProcessing(true);
    setState("uploading");

    try {
      const nextResult = await simulateSecureDocumentUpload(intent, scenario);
      setResult(nextResult);
      setState(nextResult.state);
    } catch {
      const fallback: CargaSeguraUxResult = {
        state: "unknown_error",
        title: "Error no reconocido",
        message: "No se pudo simular el resultado de carga segura.",
        retryPolicy: "none",
      };
      setResult(fallback);
      setState(fallback.state);
    } finally {
      setProcessing(false);
    }
  }

  function handleClear() {
    setIntent(null);
    setResult(null);
    setState("idle");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Carga documental segura</CardTitle>
            <CardDescription>
              Experiencia UX desacoplada con fixtures y mock client. No consume Gateway ni ms-documentos.
            </CardDescription>
          </div>
          <CargaDocumentalEstado state={state} />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <section className="rounded-lg border bg-muted/20 p-4">
          <p className="text-sm font-medium">Contexto operativo simulado</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Empresa</dt>
              <dd>{context.empresa}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Contexto</dt>
              <dd>{context.contextoLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Expediente</dt>
              <dd>{context.expedienteLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Documento principal</dt>
              <dd>{context.documentoPrincipalLabel}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Tipo documental esperado</dt>
              <dd>{context.tipoDocumentalEsperado}</dd>
            </div>
          </dl>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <CargaDocumentalDropzone
            disabled={processing}
            onFileAccepted={handleFileAccepted}
            onRejected={handleRejected}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="carga-segura-scenario">
              Escenario mock
            </label>
            <select
              id="carga-segura-scenario"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={scenario}
              disabled={processing}
              onChange={(event) => {
                setScenario(event.target.value as CargaSeguraMockScenario);
                setResult(null);
                setState(intent ? "file_selected" : "idle");
              }}
            >
              {SCENARIOS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Selector temporal solo para evidencias GO-UX. No representa navegación productiva.
            </p>
          </div>
        </div>

        <CargaDocumentalResumenArchivo intent={intent} />

        <CargaDocumentalMensajes result={result} />

        <CargaDocumentalAcciones
          intent={intent}
          result={result}
          processing={processing}
          onSubmit={executeSimulation}
          onManualRetry={executeSimulation}
          onClear={handleClear}
        />
      </CardContent>
    </Card>
  );
}
