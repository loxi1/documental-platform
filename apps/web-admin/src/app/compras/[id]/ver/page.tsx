"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  getExpedienteAlertas,
  getExpedienteDocumentos,
  getExpedienteEstadoDocumental,
  getExpedienteResumen,
  getExpedienteTimeline,
} from "@/services/expedientes";

type OcrMetadata360 = {
  numero?: string | number | null;
  fechaEmision?: string | null;
  proveedor?: string | null;
  rucProveedor?: string | null;
  montoTotal?: number | string | null;
  moneda?: string | null;
  codigoExpediente?: string | null;
};

type ExpedienteDocumento360 = {
  expediente_id?: string | number;
  expedienteId?: string | number;
  documento_id?: number;
  documentoId?: number;
  tipo_relacion?: string | null;
  tipoRelacion?: string | null;
  es_principal?: boolean | null;
  esPrincipal?: boolean | null;
  orden?: number | null;
  creado_en?: string | null;
  creadoEn?: string | null;
  cliente_abreviatura?: string | null;
  clienteAbreviatura?: string | null;
  tipo_documental?: string | null;
  tipoDocumental?: string | null;
  ruc_emisor?: string | null;
  rucEmisor?: string | null;
  razon_social_emisor?: string | null;
  razonSocialEmisor?: string | null;
  serie?: string | null;
  numero?: string | null;
  clave_documental?: string | null;
  claveDocumental?: string | null;
  estado?: string | null;
  fecha_emision?: string | null;
  fechaEmision?: string | null;
  moneda?: string | null;
  monto_total?: number | string | null;
  montoTotal?: number | string | null;
  archivo_id?: number | null;
  archivoId?: number | null;
  nombre_archivo?: string | null;
  nombreArchivo?: string | null;
  storage_provider?: string | null;
  storageProvider?: string | null;
  storage_bucket?: string | null;
  storageBucket?: string | null;
  storage_key?: string | null;
  storageKey?: string | null;
  archivo_estado?: string | null;
  archivoEstado?: string | null;
  area_origen?: string | null;
  areaOrigen?: string | null;
  metadata?: (Record<string, unknown> & OcrMetadata360) | null;
};

type TimelineItem360 = {
  id?: string | number;
  fecha?: string | null;
  creado_en?: string | null;
  creadoEn?: string | null;
  tipo?: string | null;
  tipo_evento?: string | null;
  tipoEvento?: string | null;
  tipo_documental?: string | null;
  tipoDocumental?: string | null;
  descripcion?: string | null;
  mensaje?: string | null;
  estado?: string | null;
  numero?: string | null;
  tipo_relacion?: string | null;
  tipoRelacion?: string | null;
};

type Alerta360 = {
  id?: string | number;
  titulo?: string | null;
  tipo?: string | null;
  prioridad?: string | null;
  estado?: string | null;
  mensaje?: string | null;
  descripcion?: string | null;
  creado_en?: string | null;
  creadoEn?: string | null;
};

type EstadoDocumentalItem = [label: string, key: string];

function texto(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function fecha(value: unknown) {
  if (!value) return "—";

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString("es-PE");
}

function moneda(value: unknown, currency?: string | null) {
  if (value === null || value === undefined || value === "") return "—";

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return String(value);

  const code = String(currency ?? "").toUpperCase();
  const currencyCode = code.includes("DOLAR") || code === "USD" ? "USD" : "PEN";

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: currencyCode,
  }).format(numericValue);
}

function getArray<T>(value: unknown, key?: string): T[] {
  if (Array.isArray(value)) return value as T[];

  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;

  if (key && Array.isArray(record[key])) return record[key] as T[];
  if (Array.isArray(record.items)) return record.items as T[];
  if (Array.isArray(record.documentos)) return record.documentos as T[];
  if (Array.isArray(record.alertas)) return record.alertas as T[];
  if (Array.isArray(record.timeline)) return record.timeline as T[];

  return [];
}

function isPrincipal(doc: ExpedienteDocumento360) {
  return Boolean(
    doc.es_principal ||
      doc.esPrincipal ||
      String(doc.tipo_relacion ?? doc.tipoRelacion ?? "").startsWith(
        "principal_",
      ),
  );
}

function metadataRecord(doc?: ExpedienteDocumento360) {
  return (doc?.metadata ?? {}) as Record<string, unknown> & OcrMetadata360;
}

function nestedMetadata(doc?: ExpedienteDocumento360) {
  const metadata = metadataRecord(doc);
  const candidates = [
    metadata,
    metadata.ocr,
    metadata.ocrMetadata,
    metadata.resultadoOcr,
    metadata.metadata,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      return candidate as Record<string, unknown> & OcrMetadata360;
    }
  }

  return metadata;
}

function InfoCard({ label, value }: { label: string; value: unknown }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-100">
        {texto(value)}
      </p>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-slate-100">
        {texto(value)}
      </p>
    </div>
  );
}

const estadoItems: EstadoDocumentalItem[] = [
  ["OC", "principal_oc"],
  ["OS", "principal_os"],
  ["Factura", "principal_factura"],
  ["Guía", "adjunto_guia"],
  ["Nota ingreso", "adjunto_nota_ingreso"],
  ["Transferencia", "adjunto_transferencia"],
  ["Detracción", "adjunto_detraccion"],
  ["Recibo honorario", "adjunto_recibo_honorario"],
];

export default function CompraExpedienteVerPage() {
  const params = useParams();
  const id = String(params.id);

  const resumenQuery = useQuery({
    queryKey: ["expediente-resumen", id],
    queryFn: () => getExpedienteResumen(id),
    enabled: Boolean(id),
  });

  const documentosQuery = useQuery({
    queryKey: ["expediente-documentos", id],
    queryFn: () => getExpedienteDocumentos(id),
    enabled: Boolean(id),
  });

  const estadoDocumentalQuery = useQuery({
    queryKey: ["expediente-estado-documental", id],
    queryFn: () => getExpedienteEstadoDocumental(id),
    enabled: Boolean(id),
  });

  const timelineQuery = useQuery({
    queryKey: ["expediente-timeline", id],
    queryFn: () => getExpedienteTimeline(id),
    enabled: Boolean(id),
  });

  const alertasQuery = useQuery({
    queryKey: ["expediente-alertas", id],
    queryFn: () => getExpedienteAlertas(id),
    enabled: Boolean(id),
  });

  const resumen = resumenQuery.data as Record<string, any> | undefined;
  const expediente = resumen?.expediente as Record<string, any> | undefined;

  const documentos = Array.isArray(documentosQuery.data)
    ? (documentosQuery.data as ExpedienteDocumento360[])
    : ((resumen?.documentos ?? []) as ExpedienteDocumento360[]);

  const documentosPrincipales = documentos.filter(isPrincipal);
  const documentosAdjuntos = documentos.filter((doc) => !isPrincipal(doc));
  const totalDocumentos = resumen?.totales?.documentos ?? documentos.length;

  const estadoDocumental = estadoDocumentalQuery.data as
    | Record<string, any>
    | undefined;
  const conteoDocumental = estadoDocumental?.documentos ?? {};

  const timelineData = timelineQuery.data as Record<string, any> | undefined;
  const timeline = getArray<TimelineItem360>(timelineData, "timeline");
  const alertas = getArray<Alerta360>(alertasQuery.data, "alertas");

  const principal =
    documentosPrincipales[0] ??
    documentos.find((doc) => doc.es_principal || doc.esPrincipal) ??
    documentos.find((doc) =>
      String(doc.tipo_relacion ?? doc.tipoRelacion ?? "").startsWith(
        "principal_",
      ),
    ) ??
    documentos[0];

  const principalMetadata = nestedMetadata(principal);
  const principalNumero =
    principal?.numero ?? principalMetadata.numero ?? principalMetadata["numero"];
  const principalFechaEmision =
    principal?.fecha_emision ??
    principal?.fechaEmision ??
    principalMetadata.fechaEmision;
  const principalProveedor =
    principal?.razon_social_emisor ??
    principal?.razonSocialEmisor ??
    principalMetadata.proveedor;
  const principalRucProveedor =
    principal?.ruc_emisor ?? principal?.rucEmisor ?? principalMetadata.rucProveedor;
  const principalMoneda = principal?.moneda ?? principalMetadata.moneda;
  const principalMonto =
    principal?.monto_total ?? principal?.montoTotal ?? principalMetadata.montoTotal;

  const cargando =
    resumenQuery.isLoading ||
    documentosQuery.isLoading ||
    estadoDocumentalQuery.isLoading ||
    timelineQuery.isLoading ||
    alertasQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Compras 360°</p>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-100">
            {texto(
              expediente?.codigo_expediente ?? expediente?.codigoExpediente ?? id,
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {texto(expediente?.descripcion)}
          </p>
        </div>

        <Link
          href="/compras"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          Volver
        </Link>
      </div>

      {cargando ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cargando expediente...
          </p>
        </section>
      ) : null}

      {resumenQuery.isError ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          No se pudo cargar el expediente.
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          label="Empresa"
          value={expediente?.empresa_codigo ?? expediente?.empresaCodigo}
        />
        <InfoCard
          label="Cliente destino"
          value={
            expediente?.clienteNombre ??
            expediente?.cliente_nombre ??
            expediente?.cliente_destino_id ??
            expediente?.clienteDestinoId
          }
        />
        <InfoCard label="Estado" value={expediente?.estado} />
        <InfoCard label="Documentos" value={totalDocumentos} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Estado documental
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Completitud del expediente según documentos vinculados.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          {estadoItems.map(([label, key]) => {
            const total = Number(conteoDocumental?.[key] ?? 0);

            return (
              <div
                key={key}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {total > 0 ? `✓ ${total}` : "— 0"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Documento principal
            </h2>
            <p className="text-sm text-slate-400">
              Documento base del expediente.
            </p>
          </div>
        </div>

        {principal ? (
          <div className="grid gap-4 md:grid-cols-3">
            <DetailItem
              label="Tipo"
              value={principal.tipo_documental ?? principal.tipoDocumental}
            />
            <DetailItem
              label="Archivo"
              value={principal.nombre_archivo ?? principal.nombreArchivo}
            />
            <DetailItem
              label="Relación"
              value={principal.tipo_relacion ?? principal.tipoRelacion}
            />
            <DetailItem label="Número" value={principalNumero} />
            <DetailItem label="Fecha emisión" value={fecha(principalFechaEmision)} />
            <DetailItem label="Proveedor" value={principalProveedor} />
            <DetailItem label="RUC proveedor" value={principalRucProveedor} />
            <DetailItem
              label="Monto"
              value={moneda(principalMonto, texto(principalMoneda, ""))}
            />
            <DetailItem label="Moneda" value={principalMoneda} />
            <DetailItem label="Estado" value={principal.estado} />
            <DetailItem
              label="Archivo ID"
              value={principal.archivo_id ?? principal.archivoId}
            />
            <DetailItem
              label="Storage"
              value={principal.storage_provider ?? principal.storageProvider}
            />
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            No hay documento principal vinculado.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Documentos vinculados
            </h2>
            <p className="text-sm text-slate-400">
              Incluye documento principal y adjuntos del expediente.
            </p>
          </div>
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-300">
            Adjuntos: {documentosAdjuntos.length}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Tipo</th>
                <th className="py-2">Relación</th>
                <th className="py-2">Archivo</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Área</th>
                <th className="py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc, index) => (
                <tr
                  key={`${doc.documento_id ?? doc.documentoId ?? index}`}
                  className="border-t border-slate-200 dark:border-slate-800"
                >
                  <td className="py-3">
                    {texto(doc.tipo_documental ?? doc.tipoDocumental)}
                  </td>
                  <td className="py-3">
                    {texto(doc.tipo_relacion ?? doc.tipoRelacion)}
                  </td>
                  <td className="py-3">
                    {texto(doc.nombre_archivo ?? doc.nombreArchivo)}
                  </td>
                  <td className="py-3">{texto(doc.estado)}</td>
                  <td className="py-3">
                    {texto(doc.area_origen ?? doc.areaOrigen)}
                  </td>
                  <td className="py-3">{fecha(doc.creado_en ?? doc.creadoEn)}</td>
                </tr>
              ))}

              {!documentos.length ? (
                <tr>
                  <td colSpan={6} className="py-4 text-slate-400">
                    No hay documentos vinculados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Timeline
          </h2>

          <div className="mt-4 space-y-3">
            {timeline.map((item, index) => (
              <div
                key={`${item.id ?? index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {fecha(item.fecha ?? item.creado_en ?? item.creadoEn)}
                </p>
                <p className="mt-1 font-medium text-slate-950 dark:text-slate-100">
                  {texto(
                    item.tipo ??
                      item.tipo_evento ??
                      item.tipoEvento ??
                      item.tipo_documental ??
                      item.tipoDocumental,
                  )}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {texto(
                    item.descripcion ??
                      item.mensaje ??
                      item.tipo_relacion ??
                      item.tipoRelacion ??
                      item.estado,
                  )}
                </p>
              </div>
            ))}

            {!timeline.length ? (
              <p className="text-sm text-slate-400">
                No hay eventos registrados.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Alertas
          </h2>

          <div className="mt-4 space-y-3">
            {alertas.map((alerta, index) => (
              <div
                key={`${alerta.id ?? index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-950 dark:text-slate-100">
                    {texto(alerta.titulo ?? alerta.tipo ?? "Alerta")}
                  </p>
                  <span className="rounded-full border border-slate-300 px-2 py-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-300">
                    {texto(alerta.prioridad ?? alerta.estado)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {texto(alerta.mensaje ?? alerta.descripcion)}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {fecha(alerta.creado_en ?? alerta.creadoEn)}
                </p>
              </div>
            ))}

            {!alertas.length ? (
              <p className="text-sm text-slate-400">No hay alertas activas.</p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
