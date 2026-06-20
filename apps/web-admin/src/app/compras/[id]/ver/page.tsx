"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  getExpediente,
  getExpedienteAlertas,
  getExpedienteDocumentos,
  getExpedienteTimeline,
} from "@/services/expedientes";

function texto(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function fecha(value: unknown) {
  if (!value) return "—";
  try {
    return new Date(String(value)).toLocaleString("es-PE");
  } catch {
    return String(value);
  }
}

function getArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    "items" in value &&
    Array.isArray((value as any).items)
  ) {
    return (value as any).items;
  }
  if (
    value &&
    typeof value === "object" &&
    "documentos" in value &&
    Array.isArray((value as any).documentos)
  ) {
    return (value as any).documentos;
  }
  if (
    value &&
    typeof value === "object" &&
    "alertas" in value &&
    Array.isArray((value as any).alertas)
  ) {
    return (value as any).alertas;
  }
  if (
    value &&
    typeof value === "object" &&
    "timeline" in value &&
    Array.isArray((value as any).timeline)
  ) {
    return (value as any).timeline;
  }

  return [];
}

export default function CompraExpedienteVerPage() {
  const params = useParams();
  const id = String(params.id);

  const expedienteQuery = useQuery({
    queryKey: ["expediente", id],
    queryFn: () => getExpediente(id),
    enabled: Boolean(id),
  });

  const documentosQuery = useQuery({
    queryKey: ["expediente-documentos", id],
    queryFn: () => getExpedienteDocumentos(id),
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

  const expediente = expedienteQuery.data as any;
  const documentos = getArray(documentosQuery.data);
  const timeline = getArray(timelineQuery.data);
  const alertas = getArray(alertasQuery.data);

  const principal =
    documentos.find((doc) => doc.es_principal || doc.esPrincipal) ??
    documentos.find((doc) =>
      String(doc.tipo_relacion ?? doc.tipoRelacion ?? "").startsWith(
        "principal_",
      ),
    ) ??
    documentos[0];

  const cargando =
    expedienteQuery.isLoading ||
    documentosQuery.isLoading ||
    timelineQuery.isLoading ||
    alertasQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">Expediente 360°</p>
            <h1 className="text-2xl font-semibold">
              {texto(
                expediente?.codigo_expediente ??
                  expediente?.codigoExpediente ??
                  id,
              )}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {texto(expediente?.descripcion)}
            </p>
          </div>

          <Link
            href="/compras"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900"
          >
            Volver
          </Link>
        </div>

        {cargando ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            Cargando expediente...
          </section>
        ) : null}

        {expedienteQuery.isError ? (
          <section className="rounded-2xl border border-red-900 bg-red-950/40 p-5 text-red-200">
            No se pudo cargar el expediente.
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-slate-900">Empresa</p>
            <p className="mt-1 font-medium">
              {texto(expediente?.empresa_codigo ?? expediente?.empresaCodigo)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-slate-900">Cliente destino</p>
            <p className="mt-1 font-medium">
              {texto(
                expediente?.cliente_destino_id ?? expediente?.clienteDestinoId,
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-slate-900">Estado</p>
            <p className="mt-1 font-medium">{texto(expediente?.estado)}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-slate-900">Documentos</p>
            <p className="mt-1 font-medium">{documentos.length}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Documento principal</h2>
              <p className="text-sm text-slate-400">
                Documento base del expediente.
              </p>
            </div>
          </div>

          {principal ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-slate-900">Tipo</p>
                <p>{texto(principal.tipo_documental ?? principal.tipoDocumental)}</p>
              </div>
              <div>
                <p className="text-slate-900">Clave documental</p>
                <p>{texto(principal.clave_documental ?? principal.claveDocumental)}</p>
              </div>
              <div>
                <p className="text-slate-900">Relación</p>
                <p>{texto(principal.tipo_relacion ?? principal.tipoRelacion)}</p>
              </div>
              <div>
                <p className="text-slate-900">Proveedor</p>
                <p>
                  {texto(
                    principal.razon_social_emisor ??
                      principal.razonSocialEmisor ??
                      principal.metadata?.proveedor,
                  )}
                </p>
              </div>
              <div>
                <p className="text-slate-900">RUC</p>
                <p>
                  {texto(
                    principal.ruc_emisor ??
                      principal.rucEmisor ??
                      principal.metadata?.rucProveedor,
                  )}
                </p>
              </div>
              <div>
                <p className="text-slate-900">Monto</p>
                <p>
                  {texto(
                    principal.monto_total ??
                      principal.montoTotal ??
                      principal.metadata?.montoTotal,
                  )}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              No hay documento principal vinculado.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold">Adjuntos</h2>

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
                  <tr key={index} className="border-t border-slate-800">
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
                    <td className="py-3">
                      {fecha(doc.creado_en ?? doc.creadoEn)}
                    </td>
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Timeline</h2>

            <div className="mt-4 space-y-3">
              {timeline.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-3"
                >
                  <p className="text-slate-900">
                    {fecha(item.fecha ?? item.creado_en ?? item.creadoEn)}
                  </p>
                  <p className="mt-1 font-medium">
                    {texto(item.tipo ?? item.tipo_evento ?? item.tipoEvento)}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {texto(item.descripcion ?? item.mensaje)}
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

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Alertas</h2>

            <div className="mt-4 space-y-3">
              {alertas.map((alerta, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">
                      {texto(alerta.titulo ?? alerta.tipo ?? "Alerta")}
                    </p>
                    <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">
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
                <p className="text-sm text-slate-400">
                  No hay alertas activas.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}