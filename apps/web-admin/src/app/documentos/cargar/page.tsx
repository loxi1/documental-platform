"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Banknote,
  Boxes,
  Building2,
  CheckCircle2,
  Circle,
  FileCheck2,
  FileText,
  Link2,
  MailPlus,
  Paperclip,
  Search,
  Send,
  UploadCloud,
  UserRoundCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useExpediente, useExpedientes } from "@/hooks/useExpedientes";
import { useSubirDocumentoGuiado } from "@/hooks/useCargaGuiada";
import type { Expediente, ExpedienteDocumento } from "@/types/expediente";
import type {
  AreaOrigen,
  CargaGuiadaAccion,
  CargaGuiadaPayloadPreview,
  ClienteDestinoOption,
} from "@/types/carga-guiada";

const CLIENTES: ClienteDestinoOption[] = [
  { abreviatura: "BBTI", nombreOficial: "BBTI S.A.C.", ruc: "20565747356" },
  { abreviatura: "BBTEC", nombreOficial: "BB TECNOLOGIA INDUSTRIAL S.A.C.", ruc: "20299922821" },
  { abreviatura: "CIMA", nombreOficial: "CONSORCIO CIMA ENERGY", ruc: "20613521004" },
  { abreviatura: "HUANCA", nombreOficial: "CONSORCIO HUANCAVELICA", ruc: "20612122416" },
  { abreviatura: "TARMA", nombreOficial: "CONSORCIO ILUMINACION TARMA 2025", ruc: "20614307197" },
  { abreviatura: "KIMBIRI", nombreOficial: "Consorcio Kimbiri", ruc: "20609856140" },
];

const AREAS: Array<{
  id: AreaOrigen;
  titulo: string;
  resumen: string;
  descripcion: string;
  referencia: string;
  icon: ReactNode;
}> = [
  {
    id: "COMPRAS",
    titulo: "Compras",
    resumen: "Vincula documentos eje",
    descripcion: "OC, OS, factura directa y documentos de apoyo.",
    referencia: "Busca expediente / PR / centro de costo",
    icon: <MailPlus className="h-4 w-4" />,
  },
  {
    id: "ALMACEN",
    titulo: "Almacén",
    resumen: "Adjunta recepción",
    descripcion: "Guía, nota de ingreso y factura escaneada.",
    referencia: "Busca OC / OS; el sistema resuelve el expediente",
    icon: <Boxes className="h-4 w-4" />,
  },
  {
    id: "FINANZAS",
    titulo: "Finanzas",
    resumen: "Adjunta pago",
    descripcion: "Transferencia, detracción y factura sellada o firmada.",
    referencia: "Busca factura; el sistema resuelve el expediente",
    icon: <Banknote className="h-4 w-4" />,
  },
  {
    id: "RRHH",
    titulo: "RR.HH.",
    resumen: "Adjunta RH",
    descripcion: "Recibos por honorarios y sustentos relacionados.",
    referencia: "Busca expediente o persona relacionada",
    icon: <UserRoundCheck className="h-4 w-4" />,
  },
];

const ACCIONES: CargaGuiadaAccion[] = [
  {
    id: "compras-oc",
    area: "COMPRAS",
    titulo: "Orden de compra",
    descripcion: "Documento eje creado o enviado por Compras.",
    tipoEsperado: "OC",
    tipoRelacionSugerida: "principal_oc",
  },
  {
    id: "compras-os",
    area: "COMPRAS",
    titulo: "Orden de servicio",
    descripcion: "Documento eje para servicios.",
    tipoEsperado: "OS",
    tipoRelacionSugerida: "principal_os",
  },
  {
    id: "compras-factura",
    area: "COMPRAS",
    titulo: "Factura directa",
    descripcion: "Gasto directo sin OC/OS previa.",
    tipoEsperado: "FACTURA",
    tipoRelacionSugerida: "principal_factura",
  },
  {
    id: "compras-otro",
    area: "COMPRAS",
    titulo: "Otro / cotización / proforma",
    descripcion: "Sustento de apoyo. No reemplaza al documento eje.",
    tipoEsperado: "OTRO",
    tipoRelacionSugerida: "adjunto_otro",
  },
  {
    id: "almacen-guia",
    area: "ALMACEN",
    titulo: "Guía de remisión",
    descripcion: "Sustento operativo de recepción o traslado.",
    tipoEsperado: "GUIA_REMISION",
    tipoRelacionSugerida: "adjunto_guia",
    documentoBaseLabel: "OC / OS asociada",
  },
  {
    id: "almacen-ni",
    area: "ALMACEN",
    titulo: "Nota de ingreso",
    descripcion: "Documento generado por almacén con OC y número NI.",
    tipoEsperado: "NOTA_INGRESO",
    tipoRelacionSugerida: "adjunto_nota_ingreso",
    documentoBaseLabel: "OC / OS asociada",
  },
  {
    id: "almacen-factura",
    area: "ALMACEN",
    titulo: "Factura escaneada",
    descripcion: "Factura física con sello, firma o código PR escrito.",
    tipoEsperado: "FACTURA",
    tipoRelacionSugerida: "adjunto_factura",
    documentoBaseLabel: "OC / OS asociada",
  },
  {
    id: "almacen-otro",
    area: "ALMACEN",
    titulo: "Otro sustento",
    descripcion: "Acta, imagen o evidencia operativa no contable.",
    tipoEsperado: "OTRO",
    tipoRelacionSugerida: "adjunto_otro",
  },
  {
    id: "finanzas-transferencia",
    area: "FINANZAS",
    titulo: "Transferencia",
    descripcion: "Comprobante bancario: BCP, BBVA, Interbank o Scotiabank.",
    tipoEsperado: "PAGO_TRANSFERENCIA",
    tipoRelacionSugerida: "adjunto_transferencia",
    documentoBaseLabel: "Factura pagada",
    requiereDocumentoBase: true,
  },
  {
    id: "finanzas-detraccion",
    area: "FINANZAS",
    titulo: "Detracción",
    descripcion: "Constancia de detracción o pago BN.",
    tipoEsperado: "PAGO_DETRACCION",
    tipoRelacionSugerida: "adjunto_detraccion",
    documentoBaseLabel: "Factura asociada",
    requiereDocumentoBase: true,
  },
  {
    id: "finanzas-factura-firmada",
    area: "FINANZAS",
    titulo: "Factura firmada / sellada",
    descripcion: "Escaneo con sello, firma o código de expediente escrito.",
    tipoEsperado: "FACTURA",
    tipoRelacionSugerida: "adjunto_factura",
    documentoBaseLabel: "Factura lógica existente",
  },
  {
    id: "rrhh-rh",
    area: "RRHH",
    titulo: "Recibo por honorarios",
    descripcion: "RH para sustento y revisión documental.",
    tipoEsperado: "RECIBO_HONORARIO",
    tipoRelacionSugerida: "adjunto_recibo_honorario",
  },
];

const STATUS_ITEMS: Array<{
  key: string;
  label: string;
  relaciones: string[];
}> = [
  { key: "principal", label: "Documento eje", relaciones: ["principal_oc", "principal_os", "principal_factura"] },
  { key: "factura", label: "Factura", relaciones: ["principal_factura", "adjunto_factura"] },
  { key: "guia", label: "Guía", relaciones: ["adjunto_guia"] },
  { key: "ni", label: "Nota ingreso", relaciones: ["adjunto_nota_ingreso"] },
  { key: "pago", label: "Pago", relaciones: ["adjunto_transferencia", "adjunto_detraccion"] },
  { key: "rh", label: "RH", relaciones: ["adjunto_recibo_honorario"] },
  { key: "otro", label: "Otros", relaciones: ["adjunto_otro"] },
];

function getExpedienteCodigo(expediente: Expediente) {
  return (
    expediente.codigo_op ??
    expediente.codigoOp ??
    expediente.codigo_centro_costo ??
    expediente.codigoCentroCosto ??
    expediente.correlativo
  );
}

function getExpedienteEmpresa(expediente: Expediente) {
  return expediente.empresa_codigo ?? expediente.empresaCodigo ?? "";
}

function getExpedienteTipo(expediente: Expediente) {
  return expediente.tipo_expediente ?? expediente.tipoExpediente ?? "-";
}

function getDocumentoRelacion(documento: ExpedienteDocumento) {
  return documento.tipoRelacion ?? "";
}

function getDocumentoLabel(documento: ExpedienteDocumento) {
  const tipo = documento.tipoDocumental ?? "DOC";
  const serieNumero = [documento.serie, documento.numero].filter(Boolean).join("-");
  return serieNumero ? `${tipo} ${serieNumero}` : `${tipo} #${documento.documentoId}`;
}

function matchesExpediente(expediente: Expediente, search: string) {
  if (!search.trim()) return true;
  const normalized = search.trim().toLowerCase();
  const fields = [
    expediente.correlativo,
    getExpedienteCodigo(expediente),
    expediente.descripcion,
    getExpedienteEmpresa(expediente),
    getExpedienteTipo(expediente),
    expediente.clave_principal,
    expediente.clavePrincipal,
    ...(expediente.documentos ?? []).flatMap((doc) => [
      doc.tipoDocumental,
      doc.serie,
      doc.numero,
      doc.claveDocumental,
      doc.nombreArchivo,
    ]),
  ];

  return fields.some((field) => String(field ?? "").toLowerCase().includes(normalized));
}

function inferAreaFromContext(
  permisos: { menus?: string[]; actions?: string[] } | undefined,
  perfil?: string,
): AreaOrigen {
  const menus = permisos?.menus ?? [];
  if (perfil === "admin") return "COMPRAS";
  if (menus.includes("finanzas")) return "FINANZAS";
  if (menus.includes("almacen")) return "ALMACEN";
  if (menus.includes("compras")) return "COMPRAS";
  return "COMPRAS";
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default function CargaGuiadaDocumentosPage() {
  const { contexto } = useAuth();
  const empresaInicial = contexto?.empresa ?? "BBTI";
  const areaInicial = inferAreaFromContext(contexto?.permisos, contexto?.perfil);
  const canSwitchArea = contexto?.perfil === "admin";

  const [empresa, setEmpresa] = useState(empresaInicial);
  const [area, setArea] = useState<AreaOrigen>(areaInicial);
  const [accionId, setAccionId] = useState("compras-oc");
  const [expedienteSearch, setExpedienteSearch] = useState("");
  const [expedienteId, setExpedienteId] = useState<string>("");
  const [documentoBaseId, setDocumentoBaseId] = useState("");
  const [observacion, setObservacion] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const expedientesQuery = useExpedientes();
  const expedienteDetalleQuery = useExpediente(expedienteId || undefined);
  const subirMutation = useSubirDocumentoGuiado();

  useEffect(() => {
    if (contexto?.empresa) setEmpresa(contexto.empresa);
  }, [contexto?.empresa]);

  useEffect(() => {
    const nextArea = inferAreaFromContext(contexto?.permisos, contexto?.perfil);
    setArea(nextArea);
    const first = ACCIONES.find((item) => item.area === nextArea);
    if (first) setAccionId(first.id);
  }, [contexto?.perfil, contexto?.permisos]);

  const accionesArea = useMemo(
    () => ACCIONES.filter((accion) => accion.area === area),
    [area],
  );

  const accion = useMemo(
    () => accionesArea.find((item) => item.id === accionId) ?? accionesArea[0] ?? ACCIONES[0],
    [accionId, accionesArea],
  );

  const expedientes = expedientesQuery.data ?? [];
  const expedientesFiltrados = useMemo(
    () =>
      expedientes
        .filter((expediente) => !empresa || getExpedienteEmpresa(expediente) === empresa)
        .filter((expediente) => matchesExpediente(expediente, expedienteSearch))
        .slice(0, 8),
    [empresa, expedientes, expedienteSearch],
  );

  const expedienteBase = useMemo(
    () => expedientes.find((item) => String(item.id) === expedienteId) ?? null,
    [expedienteId, expedientes],
  );

  const expedienteSeleccionado = expedienteDetalleQuery.data ?? expedienteBase;
  const documentos = expedienteSeleccionado?.documentos ?? [];
  const cliente = CLIENTES.find((item) => item.abreviatura === empresa) ?? CLIENTES[0];
  const areaInfo = AREAS.find((item) => item.id === area) ?? AREAS[0];

  const payloadPreview: CargaGuiadaPayloadPreview = {
    areaOrigen: area,
    clienteAbreviatura: empresa,
    tipoEsperado: accion.tipoEsperado,
    expedienteId: expedienteId || null,
    documentoBaseId: documentoBaseId.trim() || null,
    tipoRelacionSugerida: accion.tipoRelacionSugerida,
    canalIngreso: "WEB_ADMIN_GUIADO",
    observacion: observacion.trim() || undefined,
  };

  function handleAreaChange(nextArea: AreaOrigen) {
    setArea(nextArea);
    const first = ACCIONES.find((item) => item.area === nextArea);
    if (first) setAccionId(first.id);
    setDocumentoBaseId("");
    setFile(null);
  }

  async function handleSubmit() {
    if (!file) return;
    await subirMutation.mutateAsync({ payload: payloadPreview, file });
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
            Carga guiada de documentos
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            El usuario selecciona contexto, el OCR extrae y valida, y el documento se confirma antes de clasificar y vincular.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full px-3 py-1">
            OCR modo GUIADO
          </Badge>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            Área: {areaInfo.titulo}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <section className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                1. Contexto operativo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[250px_1fr]">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Empresa
                  </label>
                  <Select value={empresa} onValueChange={setEmpresa}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENTES.map((item) => (
                        <SelectItem key={item.abreviatura} value={item.abreviatura}>
                          {item.abreviatura} · {item.nombreOficial}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">RUC {cliente.ruc}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {area === "ALMACEN"
                      ? "Buscar OC / OS / expediente"
                      : area === "FINANZAS"
                        ? "Buscar factura / OC / OS / expediente"
                        : "Buscar expediente / PR / centro costo"}
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={expedienteSearch}
                      onChange={(event) => setExpedienteSearch(event.target.value)}
                      placeholder={areaInfo.referencia}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {canSwitchArea ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="mb-2 flex items-center justify-between gap-3 px-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Vista de trabajo
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      En producción se resuelve por permisos del usuario.
                    </p>
                  </div>
                  <div className="grid gap-2 md:grid-cols-4">
                    {AREAS.map((item) => {
                      const active = item.id === area;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleAreaChange(item.id)}
                          className={`rounded-lg border px-3 py-2 text-left transition ${
                            active
                              ? "border-slate-950 bg-white shadow-sm dark:border-white dark:bg-white/10"
                              : "border-transparent hover:border-slate-300 dark:hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            {item.icon}
                            {item.titulo}
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">{item.resumen}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                {expedientesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando expedientes...</p>
                ) : expedientesFiltrados.length ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {expedientesFiltrados.map((expediente) => {
                      const active = String(expediente.id) === expedienteId;
                      return (
                        <button
                          key={String(expediente.id)}
                          type="button"
                          onClick={() => setExpedienteId(String(expediente.id))}
                          className={`rounded-xl border p-3 text-left transition ${
                            active
                              ? "border-slate-950 bg-white shadow-sm dark:border-white dark:bg-white/10"
                              : "border-slate-200 bg-white/80 hover:border-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950 dark:text-white">
                                {expediente.correlativo}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getExpedienteTipo(expediente)} · {getExpedienteCodigo(expediente)}
                              </p>
                            </div>
                            {active ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                            {expediente.descripcion ?? "Sin descripción"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay expedientes visibles para esta búsqueda. Puedes continuar sin expediente y vincular luego desde OCR Resultados.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4" />
                2. Documentos actuales del expediente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {expedienteSeleccionado ? (
                <>
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">
                          {expedienteSeleccionado.correlativo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getExpedienteTipo(expedienteSeleccionado)} · {getExpedienteCodigo(expedienteSeleccionado)}
                        </p>
                      </div>
                      <Badge variant="outline">{documentos.length} documentos</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {expedienteSeleccionado.descripcion ?? "Sin descripción"}
                    </p>
                  </div>

                  <div className="grid gap-2 md:grid-cols-4">
                    {STATUS_ITEMS.map((item) => {
                      const docs = documentos.filter((doc) => item.relaciones.includes(getDocumentoRelacion(doc)));
                      const present = docs.length > 0;
                      return (
                        <div
                          key={item.key}
                          className={`rounded-xl border px-3 py-2 ${
                            present
                              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                              : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold">{item.label}</span>
                            {present ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                          </div>
                          <p className="mt-1 text-[11px] opacity-80">
                            {present ? `${docs.length} registrado(s)` : "Pendiente"}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {documentos.length ? (
                    <div className="rounded-xl border border-slate-200 dark:border-white/10">
                      {documentos.slice(0, 6).map((doc, index) => (
                        <button
                          key={`${doc.documentoId}-${index}`}
                          type="button"
                          onClick={() => setDocumentoBaseId(String(doc.documentoId))}
                          className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]"
                        >
                          <div>
                            <p className="font-medium text-slate-950 dark:text-white">{getDocumentoLabel(doc)}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.tipoRelacion ?? "sin relación"} {doc.esPrincipal ? "· principal" : ""}
                            </p>
                          </div>
                          <Badge variant="outline">Usar base</Badge>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-muted-foreground dark:border-white/10">
                      Este expediente todavía no tiene documentos asociados. Compras puede registrar primero OC, OS o factura directa como documento eje.
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-muted-foreground dark:border-white/10">
                  Selecciona un expediente o documento base para ver su estado documental antes de subir archivos.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck2 className="h-4 w-4" />
                3. Agregar documento para {areaInfo.titulo}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {accionesArea.map((item) => {
                  const active = item.id === accion.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAccionId(item.id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        active
                          ? "border-slate-950 bg-slate-950 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-950"
                          : "border-slate-200 bg-white hover:border-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{item.titulo}</p>
                        <Badge variant={active ? "secondary" : "outline"} className="text-[10px]">
                          {item.tipoEsperado}
                        </Badge>
                      </div>
                      <p className={`mt-2 text-xs ${active ? "text-white/75 dark:text-slate-600" : "text-muted-foreground"}`}>
                        {item.descripcion}
                      </p>
                      <p className={`mt-3 text-[11px] ${active ? "text-white/70 dark:text-slate-600" : "text-muted-foreground"}`}>
                        {item.tipoRelacionSugerida.startsWith("principal") ? "Documento eje" : "Adjunto"} · {item.tipoRelacionSugerida}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UploadCloud className="h-4 w-4" />
                4. Archivo y validación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {accion.documentoBaseLabel ?? "Documento base opcional"}
                  </label>
                  <Input
                    value={documentoBaseId}
                    onChange={(event) => setDocumentoBaseId(event.target.value)}
                    placeholder="ID factura / OC / OS si ya existe"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Almacén puede buscar OC/OS; Finanzas puede buscar factura. El sistema resuelve el expediente.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Observación
                  </label>
                  <Input
                    value={observacion}
                    onChange={(event) => setObservacion(event.target.value)}
                    placeholder="Ej. factura sellada con código PR escrito"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-slate-500 hover:bg-slate-100 dark:border-white/15 dark:bg-white/[0.03] dark:hover:border-white/40 dark:hover:bg-white/[0.06]">
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <span className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">
                  {file ? file.name : "Seleccionar PDF, imagen o escaneo"}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  El tipo esperado viaja al OCR para reducir falsos positivos.
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf,image/*"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    El envío por correo/WhatsApp no va aquí. Después de confirmar el documento, se enviará desde ms-comunicaciones.
                  </span>
                </div>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!file || subirMutation.isPending}
                  className="h-10 px-4"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {subirMutation.isPending ? "Procesando..." : "Procesar OCR guiado"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Registro que se preparará
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Empresa</span>
                  <Badge variant="outline">{empresa}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Vista</span>
                  <Badge variant="outline">{areaInfo.titulo}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Tipo esperado</span>
                  <Badge>{accion.tipoEsperado}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Relación</span>
                  <Badge variant="secondary">{accion.tipoRelacionSugerida}</Badge>
                </div>
              </div>

              <Separator />

              <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10">
                <p className="font-semibold text-slate-950 dark:text-white">Flujo al confirmar</p>
                <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>1. OCR extrae metadata usando tipo esperado.</li>
                  <li>2. Usuario valida, edita o rechaza.</li>
                  <li>3. Backend clasifica el documento definitivo.</li>
                  <li>4. Backend vincula al expediente con la relación sugerida.</li>
                </ol>
              </div>

              <details className="rounded-xl bg-slate-950 p-3 text-xs text-slate-100 dark:bg-black">
                <summary className="cursor-pointer font-semibold text-slate-200">
                  Payload técnico
                </summary>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words">
                  {formatJson(payloadPreview)}
                </pre>
              </details>

              {expedienteSeleccionado ? (
                <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10">
                  <p className="font-semibold text-slate-950 dark:text-white">
                    Expediente seleccionado
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {expedienteSeleccionado.correlativo} · {getExpedienteCodigo(expedienteSeleccionado)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {expedienteSeleccionado.descripcion ?? "Sin descripción"}
                  </p>
                </div>
              ) : null}

              {subirMutation.isError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                  El endpoint /documentos/carga-guiada todavía no respondió correctamente. La vista ya deja listo el payload para backend.
                </div>
              ) : null}

              {subirMutation.data ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <p className="font-semibold">OCR recibido</p>
                  <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs">
                    {formatJson(subirMutation.data)}
                  </pre>
                  {subirMutation.data.ocrResultadoId || subirMutation.data.id ? (
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <Link href="/ocr-resultados">
                        <Paperclip className="mr-2 h-4 w-4" />
                        Ir a validar OCR
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
