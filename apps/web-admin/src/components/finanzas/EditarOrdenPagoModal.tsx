"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import flatpickr from "flatpickr";
import monthSelectPlugin from "flatpickr/dist/plugins/monthSelect";
import { Spanish } from "flatpickr/dist/l10n/es";
import "flatpickr/dist/flatpickr.css";
import "flatpickr/dist/plugins/monthSelect/style.css";
import { CalendarDays } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buscarProveedoresOrdenPago,
  editarOrdenPago,
  getBeneficiariosOrdenPago,
  getOpcionesOrdenPago,
  reemplazarArchivoInicialOrdenPago,
  subirArchivoInicialOrdenPago,
  type EditarOrdenPagoPayload,
  type OrdenPagoDetalle,
  type ProveedorOrdenPago,
} from "@/services/finanzas";

type Props = {
  open: boolean;
  ordenPago: OrdenPagoDetalle | null;
  onClose: () => void;
  onCompleted?: () => void | Promise<void>;
};

function errorMessage(error: unknown) {
  const candidate = error as {
    response?: {
      status?: number;
      data?: { message?: string | string[] };
    };
    message?: string;
  };

  const raw = candidate.response?.data?.message;
  const message = Array.isArray(raw) ? raw.join(", ") : raw;

  if (candidate.response?.status === 409) {
    return message || "La orden cambió o ya no admite esta edición.";
  }

  return message || candidate.message || "No se pudo actualizar la orden de pago.";
}

function idempotencyKey(prefix: string) {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}-${suffix}`;
}

function beneficiaryId(op: OrdenPagoDetalle | null) {
  if (!op) return "";
  if (op.tipoBeneficiario === "PROVEEDOR" && op.proveedorId) {
    return String(op.proveedorId);
  }
  if (
    op.tipoBeneficiario === "CLIENTE_DESTINO" &&
    op.beneficiarioClienteDestinoId
  ) {
    return String(op.beneficiarioClienteDestinoId);
  }
  if (op.tipoBeneficiario === "USUARIO" && op.beneficiarioUsuarioId) {
    return String(op.beneficiarioUsuarioId);
  }
  return "";
}

export function EditarOrdenPagoModal({
  open,
  ordenPago,
  onClose,
  onCompleted,
}: Props) {
  const [fechaEmision, setFechaEmision] = useState("");
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState("PEN");
  const [observacion, setObservacion] = useState("");

  const [periodo, setPeriodo] = useState("");
  const fechaInput = useRef<HTMLInputElement>(null);
  const fechaPicker = useRef<flatpickr.Instance | null>(null);
  const periodoInput = useRef<HTMLInputElement>(null);
  const periodoPicker = useRef<flatpickr.Instance | null>(null);
  const [codigoPago, setCodigoPago] = useState("");
  const [conceptoCodigo, setConceptoCodigo] = useState("");

  const [beneficiarioSeleccionadoId, setBeneficiarioSeleccionadoId] =
    useState("");
  const [beneficiarioNombreLibre, setBeneficiarioNombreLibre] = useState("");
  const [proveedorTexto, setProveedorTexto] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] =
    useState<ProveedorOrdenPago | null>(null);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [reemplazarArchivo, setReemplazarArchivo] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !ordenPago) return;

    setFechaEmision(ordenPago.fechaEmision?.slice(0, 10) ?? "");
    setMonto(String(ordenPago.monto ?? ""));
    setMoneda(ordenPago.moneda || "PEN");
    setObservacion(ordenPago.observacion ?? "");

    setPeriodo(
      ordenPago.periodoAnio != null && ordenPago.periodoMes != null
        ? `${String(ordenPago.periodoMes).padStart(2, "0")}-${ordenPago.periodoAnio}`
        : "",
    );
    setCodigoPago(ordenPago.codigoPago ?? "");
    setConceptoCodigo(ordenPago.conceptoCodigo ?? "");

    setBeneficiarioSeleccionadoId(beneficiaryId(ordenPago));
    setBeneficiarioNombreLibre(ordenPago.beneficiarioNombreLibre ?? "");
    setProveedorTexto("");
    setProveedorSeleccionado(null);

    setArchivo(null);
    setReemplazarArchivo(false);
    setBusy(false);
    setError(null);
  }, [open, ordenPago]);

  useEffect(() => {
    if (!open || !fechaInput.current) return;

    const picker = flatpickr(fechaInput.current, {
      static: true,
      locale: Spanish,
      defaultDate: fechaEmision || undefined,
      dateFormat: "d/m/Y",
      allowInput: false,
      onChange: (selectedDates) => {
        const selected = selectedDates[0];
        if (!selected) {
          setFechaEmision("");
          return;
        }

        const year = String(selected.getFullYear());
        const month = String(selected.getMonth() + 1).padStart(2, "0");
        const day = String(selected.getDate()).padStart(2, "0");
        setFechaEmision(`${year}-${month}-${day}`);
      },
    });

    if (!Array.isArray(picker)) fechaPicker.current = picker;

    return () => {
      fechaPicker.current = null;
      if (!Array.isArray(picker)) picker.destroy();
    };
  }, [open, ordenPago?.ordenPagoId]);

  useEffect(() => {
    if (!open || !periodoInput.current) return;

    const picker = flatpickr(periodoInput.current, {
      static: true,
      locale: Spanish,
      defaultDate: periodo
        ? `${periodo.slice(3, 7)}-${periodo.slice(0, 2)}-01`
        : undefined,
      dateFormat: "m-Y",
      allowInput: false,
      plugins: [
        monthSelectPlugin({
          shorthand: false,
          dateFormat: "m-Y",
          altFormat: "m-Y",
          theme: "light",
        }),
      ],
      onChange: (selectedDates) => {
        const selected = selectedDates[0];
        if (!selected) {
          setPeriodo("");
          return;
        }

        const month = String(selected.getMonth() + 1).padStart(2, "0");
        const year = String(selected.getFullYear());
        setPeriodo(`${month}-${year}`);
      },
    });

    if (!Array.isArray(picker)) periodoPicker.current = picker;

    return () => {
      periodoPicker.current = null;
      if (!Array.isArray(picker)) picker.destroy();
    };
  }, [open, ordenPago?.ordenPagoId]);

  const opciones = useQuery({
    queryKey: ["op-opciones-editar", ordenPago?.ordenPagoId],
    queryFn: getOpcionesOrdenPago,
    enabled: open && Boolean(ordenPago),
  });

  const conceptoSeleccionado = useMemo(
    () =>
      opciones.data?.conceptos.find(
        (concepto) => concepto.codigo === conceptoCodigo,
      ) ?? null,
    [opciones.data, conceptoCodigo],
  );

  const tipoBeneficiario =
    conceptoSeleccionado?.tipoBeneficiario ??
    ordenPago?.tipoBeneficiario ??
    "NO_APLICA";

  const usoBeneficiario =
    conceptoSeleccionado?.usoBeneficiario ??
    ordenPago?.usoBeneficiario ??
    "NO_APLICA";

  const modoSeleccionBeneficiario =
    conceptoSeleccionado?.modoSeleccionBeneficiario ??
    ordenPago?.modoSeleccionBeneficiario ??
    "NO_APLICA";

  const beneficiarios = useQuery({
    queryKey: [
      "op-beneficiarios-editar",
      ordenPago?.contenedorOperativoId,
      conceptoCodigo,
    ],
    queryFn: () =>
      getBeneficiariosOrdenPago(
        ordenPago!.contenedorOperativoId,
        conceptoCodigo,
      ),
    enabled:
      open &&
      Boolean(ordenPago) &&
      Boolean(conceptoCodigo) &&
      modoSeleccionBeneficiario === "CONFIGURADO" &&
      !["NO_APLICA", "NOMBRE_LIBRE"].includes(tipoBeneficiario),
  });

  const proveedores = useQuery({
    queryKey: ["op-proveedores-editar", proveedorTexto.trim()],
    queryFn: () => buscarProveedoresOrdenPago(proveedorTexto.trim(), 20),
    enabled:
      open &&
      tipoBeneficiario === "PROVEEDOR" &&
      modoSeleccionBeneficiario === "AUTOCOMPLETE" &&
      !proveedorSeleccionado &&
      proveedorTexto.trim().length >= 2,
  });

  if (!open || !ordenPago) return null;

  // documentos.numero es la autoridad; OP-<id> es sólo fallback visual legacy.
  const numeroPresentacion =
    String(ordenPago.numero ?? "").trim() ||
    `OP-${ordenPago.ordenPagoId}`;

  const earlyLocked = ordenPago.estadoRegularizacion === "REGULARIZADO";

  function resetBeneficiarioForConcept() {
    setBeneficiarioSeleccionadoId("");
    setBeneficiarioNombreLibre("");
    setProveedorTexto("");
    setProveedorSeleccionado(null);
    setCodigoPago("");
  }

  function buildPayload(): EditarOrdenPagoPayload {
    const payload: EditarOrdenPagoPayload = {
      fechaEmision,
      monto: Number(monto),
      moneda,
      observacion: observacion.trim() || null,
    };

    if (earlyLocked) return payload;

    const periodoMatch = /^(\\d{2})-(\\d{4})$/.exec(periodo);
    payload.periodoAnio = periodoMatch ? Number(periodoMatch[2]) : null;
    payload.periodoMes = periodoMatch ? Number(periodoMatch[1]) : null;
    payload.codigoPago = codigoPago.trim() || null;
    payload.conceptoCodigo = conceptoCodigo || null;

    payload.proveedorId =
      tipoBeneficiario === "PROVEEDOR" && beneficiarioSeleccionadoId
        ? Number(beneficiarioSeleccionadoId)
        : null;

    payload.beneficiarioClienteDestinoId =
      tipoBeneficiario === "CLIENTE_DESTINO" && beneficiarioSeleccionadoId
        ? Number(beneficiarioSeleccionadoId)
        : null;

    payload.beneficiarioUsuarioId =
      tipoBeneficiario === "USUARIO" && beneficiarioSeleccionadoId
        ? Number(beneficiarioSeleccionadoId)
        : null;

    payload.beneficiarioNombreLibre =
      tipoBeneficiario === "NOMBRE_LIBRE"
        ? beneficiarioNombreLibre.trim() || null
        : null;

    return payload;
  }

  function validate() {
    if (!fechaEmision) return "Ingrese la fecha de emisión.";

    const numericMonto = Number(monto);
    if (!Number.isFinite(numericMonto) || numericMonto <= 0) {
      return "Ingrese un monto válido.";
    }

    if (!moneda) return "Seleccione la moneda.";

    if (earlyLocked) return null;

    if (!conceptoSeleccionado) {
      return "Seleccione un concepto válido.";
    }

    if (periodo) {
      const match = /^(\d{2})-(\d{4})$/.exec(periodo);
      const mes = match ? Number(match[1]) : 0;
      if (!match || mes < 1 || mes > 12) {
        return "Use período MM-YYYY.";
      }
    }

    if (
      usoBeneficiario === "REQUERIDO" &&
      tipoBeneficiario === "NOMBRE_LIBRE" &&
      !beneficiarioNombreLibre.trim()
    ) {
      return "Ingrese el beneficiario.";
    }

    if (
      usoBeneficiario === "REQUERIDO" &&
      !["NO_APLICA", "NOMBRE_LIBRE"].includes(tipoBeneficiario) &&
      !beneficiarioSeleccionadoId
    ) {
      return "Seleccione el beneficiario.";
    }

    if (
      tipoBeneficiario === "PROVEEDOR" &&
      modoSeleccionBeneficiario === "AUTOCOMPLETE" &&
      beneficiarioSeleccionadoId &&
      (!proveedorSeleccionado ||
        String(proveedorSeleccionado.id) !== beneficiarioSeleccionadoId)
    ) {
      return "Seleccione un proveedor válido del catálogo.";
    }

    return null;
  }

  async function submit() {
    if (busy) return;

    const currentOrdenPago = ordenPago;
    if (!currentOrdenPago) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      // La identidad estructural nunca forma parte del payload.
      await editarOrdenPago(
        currentOrdenPago.ordenPagoId,
        buildPayload(),
      );

      if (reemplazarArchivo && archivo) {
        // Reemplazo OP: TEMP -> replacement R23.
        // Deliberadamente NO se ejecuta OCR.
        const temp = await subirArchivoInicialOrdenPago(
          archivo,
          idempotencyKey("op-edit-upload"),
        );

        await reemplazarArchivoInicialOrdenPago(
          currentOrdenPago.ordenPagoId,
          String(temp.tempId),
          idempotencyKey("op-edit-replace"),
        );
      }

      await onCompleted?.();
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editar-op-title"
    >
      <div className="w-[min(95vw,760px)] rounded-xl border bg-background p-6 shadow-xl">
        <h2 id="editar-op-title" className="mb-1 text-xl font-semibold">
          Editar Orden de Pago
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {numeroPresentacion} · {ordenPago.contexto.codigo}
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="space-y-3"
        >
          <fieldset disabled={busy} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                Tipo
                <select
                  value={conceptoSeleccionado?.clasificacion ?? ""}
                  disabled
                  className="block w-full rounded border bg-background p-2"
                >
                  <option value={conceptoSeleccionado?.clasificacion ?? ""}>
                    {(conceptoSeleccionado?.clasificacion ?? "Sin tipo").replaceAll("_", " ")}
                  </option>
                </select>
              </label>

              <label className="block">
                Subtipo
                <select
                  value={conceptoCodigo}
                  onChange={(e) => {
                    resetBeneficiarioForConcept();
                    setConceptoCodigo(e.target.value);
                  }}
                  disabled={earlyLocked || opciones.isLoading}
                  className="block w-full rounded border bg-background p-2"
                >
                  <option value="">Seleccione subtipo</option>
                  {(opciones.data?.conceptos ?? []).map((concepto) => (
                    <option key={concepto.codigo} value={concepto.codigo}>
                      {concepto.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                Período
                <div className="flex items-center gap-2">
                  <div className="op-flatpickr-field relative flex-1">
                    <Input
                      ref={periodoInput}
                      type="text"
                      placeholder="MM-YYYY"
                      value={periodo}
                      readOnly
                      aria-label="Período MM-YYYY"
                      className="cursor-pointer pr-10"
                      onClick={() => periodoPicker.current?.open()}
                      disabled={earlyLocked}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Abrir calendario de período"
                      className="absolute right-0 top-0"
                      onClick={() => periodoPicker.current?.open()}
                      disabled={earlyLocked}
                    >
                      <CalendarDays className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      periodoPicker.current?.clear();
                      setPeriodo("");
                    }}
                    disabled={!periodo || earlyLocked}
                  >
                    Limpiar
                  </Button>
                </div>
              </label>

              {conceptoSeleccionado?.usoCodigoPago !== "NO_APLICA" ? (
                <label className="block">
                  Referencia
                  {conceptoSeleccionado?.usoCodigoPago === "REQUERIDO" ? " *" : ""}
                  <Input
                    value={codigoPago}
                    onChange={(e) => setCodigoPago(e.target.value)}
                    required={conceptoSeleccionado?.usoCodigoPago === "REQUERIDO"}
                    maxLength={250}
                    disabled={earlyLocked}
                  />
                </label>
              ) : (
                <div />
              )}

              {tipoBeneficiario === "NOMBRE_LIBRE" ? (
                <label className="block md:col-span-2">
                  Beneficiario{usoBeneficiario === "REQUERIDO" ? " *" : ""}
                  <Input
                    value={beneficiarioNombreLibre}
                    onChange={(e) => setBeneficiarioNombreLibre(e.target.value)}
                    required={usoBeneficiario === "REQUERIDO"}
                    maxLength={250}
                    disabled={earlyLocked}
                  />
                </label>
              ) : null}

              {tipoBeneficiario === "PROVEEDOR" &&
              modoSeleccionBeneficiario === "AUTOCOMPLETE" ? (
                <div className="relative block md:col-span-2">
                  <label className="block">
                    Beneficiario{usoBeneficiario === "REQUERIDO" ? " *" : ""}
                    <Input
                      value={proveedorTexto}
                      onChange={(e) => {
                        setProveedorTexto(e.target.value);
                        setProveedorSeleccionado(null);
                        setBeneficiarioSeleccionadoId("");
                      }}
                      required={usoBeneficiario === "REQUERIDO"}
                      placeholder="Buscar por RUC o razón social"
                      autoComplete="off"
                      disabled={earlyLocked}
                    />
                  </label>

                  {!proveedorSeleccionado && proveedores.data?.length ? (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow-lg">
                      {proveedores.data.map((proveedor) => (
                        <button
                          key={proveedor.id}
                          type="button"
                          className="block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                          onClick={() => {
                            setProveedorSeleccionado(proveedor);
                            setBeneficiarioSeleccionadoId(String(proveedor.id));
                            setProveedorTexto(
                              `${proveedor.ruc} — ${proveedor.razonSocial}`,
                            );
                          }}
                        >
                          <span className="block font-medium">
                            {proveedor.razonSocial}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            RUC {proveedor.ruc}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {modoSeleccionBeneficiario === "CONFIGURADO" &&
              !["NO_APLICA", "NOMBRE_LIBRE"].includes(tipoBeneficiario) ? (
                <label className="block md:col-span-2">
                  Beneficiario{usoBeneficiario === "REQUERIDO" ? " *" : ""}
                  <select
                    value={beneficiarioSeleccionadoId}
                    onChange={(e) =>
                      setBeneficiarioSeleccionadoId(e.target.value)
                    }
                    required={usoBeneficiario === "REQUERIDO"}
                    disabled={earlyLocked || beneficiarios.isLoading}
                    className="block w-full rounded border bg-background p-2"
                  >
                    <option value="">
                      {usoBeneficiario === "OPCIONAL"
                        ? "Sin beneficiario"
                        : "Seleccione beneficiario"}
                    </option>
                    {(beneficiarios.data?.items ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                        {item.detalle ? ` — ${item.detalle}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            {earlyLocked ? (
              <p className="text-xs text-muted-foreground">
                Concepto, período, referencia y beneficiario están bloqueados por
                la regularización existente.
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                Fecha de emisión
                <div className="op-flatpickr-field relative">
                  <Input
                    ref={fechaInput}
                    required
                    type="text"
                    placeholder="dd/mm/yyyy"
                    value={
                      fechaEmision
                        ? `${fechaEmision.slice(8, 10)}/${fechaEmision.slice(5, 7)}/${fechaEmision.slice(0, 4)}`
                        : ""
                    }
                    readOnly
                    pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"
                    aria-label="Fecha de emisión dd/mm/yyyy"
                    className="cursor-pointer pr-10"
                    onClick={() => fechaPicker.current?.open()}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Abrir calendario de fecha de emisión"
                    className="absolute right-0 top-0"
                    onClick={() => fechaPicker.current?.open()}
                  >
                    <CalendarDays className="h-4 w-4" />
                  </Button>
                </div>
              </label>

              <label className="block">
                Moneda
                <select
                  required
                  className="block w-full rounded border bg-background p-2"
                  value={moneda}
                  onChange={(e) => setMoneda(e.target.value)}
                >
                  {(opciones.data?.monedas ?? []).map((item) => (
                    <option key={item.codigo} value={item.codigo}>
                      {item.nombre}
                    </option>
                  ))}
                  {!opciones.data?.monedas.some(
                    (item) => item.codigo === moneda,
                  ) ? (
                    <option value={moneda}>{moneda}</option>
                  ) : null}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                Monto
                <Input
                  required
                  type="number"
                  min="0.01"
                  max="999999999999.99"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </label>
            </div>

            <label className="block">
              Observación
              <textarea
                maxLength={2000}
                className="block w-full rounded border bg-background p-2"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
              />
            </label>

            <div className="space-y-2">
              <label className="block">Archivo inicial / sustento</label>
              <p className="break-words text-sm">
                {ordenPago.archivoInicial?.nombreArchivo
                  ? `Actual: ${ordenPago.archivoInicial.nombreArchivo}`
                  : "La OP no informa un archivo inicial actual."}
              </p>

              <Input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(e) => {
                  const next = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  setArchivo(next);
                  setReemplazarArchivo(Boolean(next));
                }}
              />

              <p className="text-xs text-muted-foreground">
                PDF, JPG o PNG. El archivo seleccionado reemplazará el archivo
                inicial conservando la identidad de la Orden de Pago.
              </p>

              {archivo ? (
                <>
                  <p className="break-words text-sm">{archivo.name}</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setArchivo(null);
                      setReemplazarArchivo(false);
                    }}
                  >
                    Quitar archivo
                  </Button>
                </>
              ) : null}
            </div>
          </fieldset>

          {opciones.isLoading ? <p>Cargando opciones…</p> : null}
          {opciones.isError ? (
            <p role="alert">No se pudieron cargar las opciones.</p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Número documental: {numeroPresentacion}. El número y los
            identificadores estructurales no son editables.
          </p>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Cerrar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
