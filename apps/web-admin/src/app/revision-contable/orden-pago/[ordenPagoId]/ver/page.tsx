"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, FileText, Link2, ReceiptText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentoPreviewModal } from "@/components/revision-contable/DocumentoPreviewModal";
import type { ExpedienteDocumento } from "@/types/expediente";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getRevisionContableOrdenPago,
  type RevisionContableOrdenPagoDetalle,
} from "@/services/revision-contable";

function texto(value: unknown, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function fecha(value: unknown) {
  const raw = texto(value, "");
  if (!raw) return "—";

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return raw;

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function importe(moneda: unknown, monto: unknown) {
  const currency = texto(moneda, "").toUpperCase();
  const numeric = Number(monto);

  if (!Number.isFinite(numeric)) {
    return [currency, texto(monto)].filter(Boolean).join(" ");
  }

  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(numeric);
  }

  if (currency === "PEN") {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
    }).format(numeric);
  }

  return [currency, numeric.toFixed(2)].filter(Boolean).join(" ");
}

function registro(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function metadataDocumento(value: unknown): Record<string, unknown> | null {
  const documento = registro(value);
  const metadata = registro(documento?.metadata);
  const ocr = registro(metadata?.ocr);
  const ocrMetadata = registro(ocr?.metadata);

  return ocrMetadata ?? metadata;
}

function monedaPago(value: unknown) {
  const raw = texto(value, "").toUpperCase();
  if (raw === "SOLES") return "PEN";
  if (raw.includes("DOLAR")) return "USD";
  return raw;
}

function estadoRegularizacionLabel(value: unknown) {
  const estado = texto(value, "").toUpperCase();

  if (estado === "PENDIENTE") return "Pendiente";
  if (estado === "NO_REQUIERE") return "No requiere regularizar";
  if (estado === "REGULARIZADO") return "Regularizado";

  return texto(value);
}

export default function RevisionContableOrdenPagoVerPage() {
  const params = useParams<{ ordenPagoId: string }>();
  const ordenPagoId = params?.ordenPagoId ?? "";

  const [previewDocumento, setPreviewDocumento] =
    useState<ExpedienteDocumento | null>(null);

  const ordenPagoQuery = useQuery<RevisionContableOrdenPagoDetalle>({
    queryKey: ["revision-contable", "orden-pago", ordenPagoId],
    queryFn: () => getRevisionContableOrdenPago(Number(ordenPagoId)),
    enabled: Boolean(ordenPagoId) && Number.isFinite(Number(ordenPagoId)),
  });

  if (ordenPagoQuery.isLoading) {
    return (
      <main className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Cargando Orden de Pago…
        </div>
      </main>
    );
  }

  if (ordenPagoQuery.isError || !ordenPagoQuery.data) {
    return (
      <main className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/revision-contable">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>

        <Card>
          <CardContent className="p-6">
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No se pudo cargar la Orden de Pago para revisión contable.
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const op = ordenPagoQuery.data;
  const numero = texto(op.numero);
  const estado = estadoRegularizacionLabel(op.estadoRegularizacion);
  const contextoCodigo =
    texto(op.contexto?.centroCostoCodigo, "") ||
    texto(op.contexto?.codigo);
  const contextoNombre = texto(op.contexto?.nombre, "");
  const concepto =
    texto(op.conceptoNombre, "") ||
    texto(op.conceptoCodigo);
  const periodo =
    op.periodoMes && op.periodoAnio
      ? `${String(op.periodoMes).padStart(2, "0")}/${op.periodoAnio}`
      : "—";

  const documentoOpPreview =
    op.archivoInicial?.archivoId
      ? ({
          documentoId: op.documentoId,
          id: op.documentoId,
          archivoId: op.archivoInicial.archivoId,
          tipoDocumental: "ORDEN_PAGO",
          tipo_documental: "ORDEN_PAGO",
          numero,
          fechaEmision: op.fechaEmision,
          fecha_emision: op.fechaEmision,
          moneda: op.moneda,
          montoTotal: op.monto,
          monto_total: op.monto,
          estado: op.estado,
          rucProveedor: op.proveedorRuc,
          ruc_proveedor: op.proveedorRuc,
          razonSocial: op.proveedorRazonSocial ?? op.beneficiarioNombreLibre,
          razon_social: op.proveedorRazonSocial ?? op.beneficiarioNombreLibre,
          concepto,
          codigoPago: op.codigoPago,
          codigo_pago: op.codigoPago,
        } as unknown as ExpedienteDocumento)
      : null;

  const tieneWorkspace =
    op.expedienteId != null &&
    Number.isSafeInteger(Number(op.expedienteId)) &&
    Number(op.expedienteId) > 0;

  const documentosRelacionados = Array.isArray(op.documentosRelacionados)
    ? op.documentosRelacionados
    : [];

  const relacion = (documento: (typeof documentosRelacionados)[number]) =>
    texto(documento.tipoRelacion, "").trim().toLowerCase();

  const regularizador =
    documentosRelacionados.find((documento) => {
      const tipoRelacion = relacion(documento);
      return (
        tipoRelacion === "regularizador_factura" ||
        tipoRelacion === "regularizador_recibo_honorario"
      );
    }) ?? null;

  const transferencias = documentosRelacionados.filter(
    (documento) => relacion(documento) === "adjunto_transferencia",
  );

  const detraccion =
    documentosRelacionados.find((documento) => {
      const tipoRelacion = relacion(documento);
      const tipoDocumental = texto(
        documento.tipoDocumental,
        "",
      ).toUpperCase();

      return (
        tipoRelacion === "adjunto_detraccion" ||
        tipoDocumental === "PAGO_DETRACCION"
      );
    }) ?? null;

  const regularizadoresPermitidos =
    Array.isArray(op.tiposDocumentalesRegularizadoresPermitidos)
      ? op.tiposDocumentalesRegularizadoresPermitidos
      : [];

  const sustentoEsperado = regularizadoresPermitidos
    .map((tipo) => {
      const normalized = String(tipo).trim().toUpperCase();

      if (
        normalized === "RECIBO_HONORARIO" ||
        normalized === "RECIBO_POR_HONORARIOS"
      ) {
        return "Recibo por honorarios";
      }

      if (normalized === "FACTURA") return "Factura";

      return String(tipo).replaceAll("_", " ");
    })
    .filter(Boolean)
    .join(" / ");

  const identidadDocumento = (
    documento: (typeof documentosRelacionados)[number] | null,
  ) => {
    if (!documento) return "—";

    const serie = texto(documento.serie, "");
    const nro = texto(documento.numero, "");

    return [serie, nro].filter(Boolean).join(" / ") || "—";
  };

  const etiquetaRegularizador = (() => {
    if (!regularizador) return "";

    const tipo = texto(regularizador.tipoDocumental, "").toUpperCase();

    if (
      tipo === "RECIBO_HONORARIO" ||
      tipo === "RECIBO_POR_HONORARIOS"
    ) {
      return "Recibo por honorarios";
    }

    if (tipo === "FACTURA") return "Factura";

    return texto(regularizador.tipoDocumental, "Documento");
  })();

  const documentoRelacionadoPreview = (
    documento: (typeof documentosRelacionados)[number],
  ) => {
    const metadata = metadataDocumento(documento);
    const esTransferencia =
      relacion(documento) === "adjunto_transferencia" ||
      texto(documento.tipoDocumental, "").toUpperCase() === "PAGO_TRANSFERENCIA";

    const numeroDocumento = esTransferencia
      ? texto(
          metadata?.numeroOperacion ??
            metadata?.numeroConstancia ??
            documento.numero,
          "",
        )
      : documento.numero;

    const fechaDocumento = esTransferencia
      ? texto(
          metadata?.fechaPago ??
            metadata?.fechaEmision ??
            documento.fechaEmision,
          "",
        )
      : documento.fechaEmision;

    const monedaDocumento = esTransferencia
      ? monedaPago(metadata?.moneda ?? documento.moneda)
      : documento.moneda;

    const montoDocumento = esTransferencia
      ? metadata?.montoTotal ??
        metadata?.montoOperacion ??
        documento.montoTotal
      : documento.montoTotal;

    const tipoDocumento = esTransferencia
      ? "PAGO_TRANSFERENCIA"
      : documento.tipoDocumental;

    return {
      documentoId: documento.documentoId,
      id: documento.documentoId,
      archivoId: documento.archivoId ?? undefined,
      tipoDocumental: tipoDocumento ?? undefined,
      tipo_documental: tipoDocumento ?? undefined,
      tipoRelacion: documento.tipoRelacion ?? undefined,
      tipo_relacion: documento.tipoRelacion ?? undefined,
      serie: documento.serie ?? undefined,
      numero: numeroDocumento ?? undefined,
      fechaEmision: fechaDocumento ?? undefined,
      fecha_emision: fechaDocumento ?? undefined,
      moneda: monedaDocumento ?? undefined,
      montoTotal: montoDocumento ?? undefined,
      monto_total: montoDocumento ?? undefined,
      estado: documento.estado ?? undefined,
      metadata: documento.metadata ?? undefined,
    } as unknown as ExpedienteDocumento;
  };

  const abrirRelacionado = (
    documento: (typeof documentosRelacionados)[number] | null,
  ) => {
    if (!documento?.archivoId) return;

    setPreviewDocumento(documentoRelacionadoPreview(documento));
  };

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">Revisión contable</h1>
            <Badge variant="secondary">Solo lectura</Badge>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {contextoCodigo || "—"} · {texto(op.empresaCodigo)} ·{" "}
            {op.periodoMes && op.periodoAnio
              ? `${String(op.periodoMes).padStart(2, "0")}-${op.periodoAnio}`
              : "Sin periodo funcional"}
          </p>

          <p className="text-sm text-muted-foreground">
            {contextoNombre || "Sin descripción"}
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 shrink-0 px-3"
        >
          <Link href="/revision-contable">Volver</Link>
        </Button>
      </div>

      <section>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Documento principal</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="rounded-xl border bg-muted/30 p-3">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-lg font-semibold">
                      OP {numero}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline">OP</Badge>

                      {op.archivoInicial?.archivoId ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-3"
                          onClick={() => setPreviewDocumento(documentoOpPreview)}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Ver
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[minmax(0,1.8fr)_minmax(120px,0.7fr)_minmax(120px,0.7fr)]">
                    <div className="min-w-0">
                      <dt className="text-xs font-medium uppercase text-muted-foreground">
                        Beneficiario
                      </dt>
                      <dd className="mt-1 font-medium">
                        {texto(
                          op.proveedorRazonSocial ??
                            op.beneficiarioNombreLibre,
                        )}
                      </dd>
                      {op.proveedorRuc ? (
                        <dd className="text-xs text-muted-foreground">
                          RUC {op.proveedorRuc}
                        </dd>
                      ) : null}
                    </div>

                    <div>
                      <dt className="text-xs font-medium uppercase text-muted-foreground">
                        Fecha
                      </dt>
                      <dd className="mt-1 font-medium">
                        {fecha(op.fechaEmision)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-medium uppercase text-muted-foreground">
                        Monto
                      </dt>
                      <dd className="mt-1 font-medium">
                        {importe(op.moneda, op.monto)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>Obligación en revisión</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vista de solo lectura por obligación y sus documentos asociados.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {op.empresaCodigo ? (
                  <Badge variant="outline">{op.empresaCodigo}</Badge>
                ) : null}

                <Badge variant="outline">
                  {regularizador
                    ? "1 documento en revisión"
                    : "Sin documento regularizador"}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="rounded-xl border bg-muted/10 p-3">
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase text-muted-foreground">
                      {regularizador
                        ? "Documento en revisión"
                        : "Obligación documental"}
                    </div>

                    {regularizador ? (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <ReceiptText className="h-4 w-4 text-muted-foreground" />

                        <span className="font-semibold">
                          {etiquetaRegularizador}{" "}
                          {identidadDocumento(regularizador)}
                        </span>

                        <Badge variant="outline">OP: {numero}</Badge>

                        {regularizador.archivoId ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-3"
                            onClick={() => abrirRelacionado(regularizador)}
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Ver
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <ReceiptText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            Pendiente de regularización
                          </span>
                          <Badge variant="outline">OP: {numero}</Badge>
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground">
                          Aún no existe un documento regularizador asociado.
                          {sustentoEsperado
                            ? ` Documento admitido: ${sustentoEsperado}.`
                            : ""}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{estado}</Badge>

                    {tieneWorkspace ? (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 px-3"
                      >
                        <Link
                          href={`/workspace/expedientes-v1/${op.expedienteId}`}
                        >
                          <Link2 className="mr-1.5 h-3.5 w-3.5" />
                          Ver Workspace
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="font-semibold">Documentos asociados</div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <div className="text-xs font-medium uppercase text-muted-foreground">
                        Pago
                      </div>

                      {transferencias.length > 0 ? (
                        <div className="mt-2 space-y-3">
                          {transferencias.map((transferencia) => {
                            const metadata = metadataDocumento(transferencia);
                            const numeroOperacion = texto(
                              metadata?.numeroOperacion ??
                                metadata?.numeroConstancia ??
                                transferencia.numero,
                              "",
                            );
                            const banco = texto(metadata?.banco, "");
                            const fechaPago = fecha(
                              metadata?.fechaPago ??
                                metadata?.fechaEmision ??
                                transferencia.fechaEmision,
                            );
                            const moneda = monedaPago(
                              metadata?.moneda ?? transferencia.moneda,
                            );
                            const monto =
                              metadata?.montoTotal ??
                              metadata?.montoOperacion ??
                              transferencia.montoTotal;
                            const montoPago =
                              monto === null ||
                              monto === undefined ||
                              texto(monto, "") === ""
                                ? ""
                                : importe(moneda, monto);

                            return (
                              <div
                                key={transferencia.documentoId}
                                className="space-y-1 border-b pb-3 last:border-b-0 last:pb-0"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium">
                                    {numeroOperacion
                                      ? `Transferencia ${numeroOperacion}`
                                      : "Transferencia"}
                                  </span>

                                  {transferencia.archivoId ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2"
                                      onClick={() => abrirRelacionado(transferencia)}
                                    >
                                      <Eye className="mr-1 h-3.5 w-3.5" />
                                      Ver
                                    </Button>
                                  ) : null}
                                </div>

                                {banco ? (
                                  <div className="text-xs text-muted-foreground">
                                    {banco}
                                  </div>
                                ) : null}

                                {fechaPago !== "—" || montoPago ? (
                                  <div className="text-xs text-muted-foreground">
                                    {[fechaPago !== "—" ? fechaPago : "", montoPago]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Transferencia —
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-3">
                      <div className="text-xs font-medium uppercase text-muted-foreground">
                        Detracción
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                        <span
                          className={
                            detraccion
                              ? "font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {detraccion
                            ? identidadDocumento(detraccion)
                            : "Detracción —"}
                        </span>

                        {detraccion?.archivoId ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => abrirRelacionado(detraccion)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            Ver
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs font-medium uppercase text-muted-foreground">
                        Concepto
                      </dt>
                      <dd className="mt-1 font-medium">{concepto}</dd>
                    </div>

                    <div>
                      <dt className="text-xs font-medium uppercase text-muted-foreground">
                        Referencia
                      </dt>
                      <dd className="mt-1 font-medium">
                        {texto(op.codigoPago)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-medium uppercase text-muted-foreground">
                        Observación
                      </dt>
                      <dd className="mt-1">
                        {texto(op.observacion)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <DocumentoPreviewModal
        documento={previewDocumento}
        documentoLogico={previewDocumento}
        ocultarClaveDocumental
        open={Boolean(previewDocumento)}
        onClose={() => setPreviewDocumento(null)}
      />
    </main>
  );
}
