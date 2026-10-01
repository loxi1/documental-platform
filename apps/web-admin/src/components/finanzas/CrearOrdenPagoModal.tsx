"use client";

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import flatpickr from 'flatpickr';
import monthSelectPlugin from 'flatpickr/dist/plugins/monthSelect';
import { Spanish } from 'flatpickr/dist/l10n/es';
import 'flatpickr/dist/flatpickr.css';
import 'flatpickr/dist/plugins/monthSelect/style.css';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  buscarContextosOrdenPago,
  crearOrdenPago,
  getBeneficiariosOrdenPago,
  getOpcionesOrdenPago,
  subirArchivoInicialOrdenPago,
} from '@/services/finanzas';
import type {
  ContextoOrdenPago,
  OrdenPagoPayload,
  ArchivoInicialOrdenPagoTemp,
} from '@/services/finanzas';
import { buscarProveedoresOrdenPago } from '@/services/finanzas';

function fechaNegocio() {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
}

function periodoNegocio() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  return year && month ? `${month}-${year}` : '';
}

export function CrearOrdenPagoModal({ workspaceId, onCreated }: { workspaceId: number; onCreated: (id: number) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const key = useRef<string | null>(null);
  const pendingPayload = useRef<OrdenPagoPayload | null>(null);
  const submitting = useRef(false);
  const uploadSequence = useRef(0);
  const uploadingRef = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const fechaInput = useRef<HTMLInputElement>(null);
  const fechaPicker = useRef<flatpickr.Instance | null>(null);
  const periodoInput = useRef<HTMLInputElement>(null);
  const periodoPicker = useRef<flatpickr.Instance | null>(null);
  const [archivoTemp, setArchivoTemp] = useState<ArchivoInicialOrdenPagoTemp | null>(null);
  const [archivoNombre, setArchivoNombre] = useState('');
  const [uploading, setUploading] = useState(false);
  const [archivoError, setArchivoError] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fecha, setFecha] = useState(fechaNegocio);
  const [conceptoCodigo, setConceptoCodigo] = useState('');
  const [clasificacion, setClasificacion] = useState('');
  const [periodo, setPeriodo] = useState(periodoNegocio);
  const [codigoPago, setCodigoPago] = useState('');
  const [beneficiarioId, setBeneficiarioId] = useState('');
  const [beneficiarioNombreLibre, setBeneficiarioNombreLibre] = useState('');
  const [proveedorTexto, setProveedorTexto] = useState('');
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<{
    id: number;
    ruc: string;
    razonSocial: string;
  } | null>(null);
  const [retry, setRetry] = useState(false);

  useEffect(() => () => { uploadSequence.current += 1; }, []);

  useEffect(() => {
    if (!open || !fechaInput.current) return;

    const picker = flatpickr(fechaInput.current, {
      static: true,
      locale: Spanish,
      defaultDate: fecha
        ? `${fecha.slice(6, 10)}-${fecha.slice(3, 5)}-${fecha.slice(0, 2)}`
        : undefined,
      dateFormat: 'd/m/Y',
      allowInput: false,
      onChange: selectedDates => {
        const selected = selectedDates[0];
        if (!selected) {
          setFecha('');
          return;
        }

        const day = String(selected.getDate()).padStart(2, '0');
        const month = String(selected.getMonth() + 1).padStart(2, '0');
        const year = String(selected.getFullYear());
        setFecha(`${day}/${month}/${year}`);
      },
    });

    if (!Array.isArray(picker)) {
      fechaPicker.current = picker;
    }

    return () => {
      fechaPicker.current = null;
      if (!Array.isArray(picker)) picker.destroy();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !periodoInput.current) return;

    const picker = flatpickr(periodoInput.current, {
      static: true,
      locale: Spanish,
      defaultDate: periodo
        ? `${periodo.slice(3, 7)}-${periodo.slice(0, 2)}-01`
        : undefined,
      dateFormat: 'm-Y',
      allowInput: false,
      plugins: [
        monthSelectPlugin({
          shorthand: false,
          dateFormat: 'm-Y',
          altFormat: 'm-Y',
          theme: 'light',
        }),
      ],
      onChange: selectedDates => {
        const selected = selectedDates[0];
        if (!selected) {
          setPeriodo('');
          return;
        }

        const month = String(selected.getMonth() + 1).padStart(2, '0');
        const year = String(selected.getFullYear());
        setPeriodo(`${month}-${year}`);
      },
    });

    if (!Array.isArray(picker)) {
      periodoPicker.current = picker;
    }

    return () => {
      periodoPicker.current = null;
      if (!Array.isArray(picker)) picker.destroy();
    };
  }, [open]);

  function quitarArchivo() {
    uploadSequence.current += 1;
    uploadingRef.current = false;
    setUploading(false);
    setArchivoTemp(null);
    setArchivoNombre('');
    setArchivoError('');
    if (fileInput.current) fileInput.current.value = '';
  }

  async function seleccionarArchivo(file?: File) {
    if (!file || submitting.current || pendingPayload.current) return;
    const sequence = ++uploadSequence.current;
    uploadingRef.current = true;
    setUploading(true);
    setArchivoTemp(null);
    setArchivoNombre(file.name);
    setArchivoError('');
    try {
      const staged = await subirArchivoInicialOrdenPago(file, crypto.randomUUID());
      if (sequence === uploadSequence.current) setArchivoTemp(staged);
    } catch {
      if (sequence === uploadSequence.current) setArchivoError('No se pudo preparar el archivo. Vuelva a seleccionarlo o quítelo para continuar sin archivo.');
    } finally {
      if (sequence === uploadSequence.current) { uploadingRef.current = false; setUploading(false); }
    }
  }

  const [contextoTexto, setContextoTexto] = useState('');
  const [contextoSeleccionado, setContextoSeleccionado] =
    useState<ContextoOrdenPago | null>(null);

  const contextoQuery = contextoTexto.trim();

  const contextos = useQuery({
    queryKey: ['op-contextos', workspaceId, contextoQuery],
    queryFn: () => buscarContextosOrdenPago(contextoQuery, 10),
    enabled: open && !contextoSeleccionado && contextoQuery.length >= 2,
  });

  const opciones = useQuery({ queryKey: ['op-opciones', workspaceId], queryFn: getOpcionesOrdenPago, enabled: open });

  const conceptoSeleccionado =
    opciones.data?.conceptos.find(concepto => concepto.codigo === conceptoCodigo) ?? null;

  const beneficiarios = useQuery({
    queryKey: [
      'op-beneficiarios',
      workspaceId,
      contextoSeleccionado?.contenedorOperativoId ?? null,
      conceptoCodigo,
    ],
    queryFn: () =>
      getBeneficiariosOrdenPago(
        contextoSeleccionado!.contenedorOperativoId,
        conceptoCodigo,
      ),
    enabled:
      open &&
      !!contextoSeleccionado &&
      !!conceptoCodigo &&
      !!conceptoSeleccionado &&
      conceptoSeleccionado.modoSeleccionBeneficiario === 'CONFIGURADO' &&
      !['NO_APLICA', 'NOMBRE_LIBRE'].includes(
        conceptoSeleccionado.tipoBeneficiario,
      ),
  });

  const proveedorQuery = proveedorTexto.trim();

  const proveedores = useQuery({
    queryKey: ['op-proveedores', workspaceId, proveedorQuery],
    queryFn: () => buscarProveedoresOrdenPago(proveedorQuery, 20),
    enabled:
      open &&
      conceptoSeleccionado?.tipoBeneficiario === 'PROVEEDOR' &&
      conceptoSeleccionado?.modoSeleccionBeneficiario === 'AUTOCOMPLETE' &&
      !proveedorSeleccionado &&
      proveedorQuery.length >= 2,
  });

  useEffect(() => {
    setCodigoPago('');
    setBeneficiarioId('');
    setBeneficiarioNombreLibre('');
    setProveedorTexto('');
    setProveedorSeleccionado(null);
  }, [conceptoCodigo, contextoSeleccionado?.contenedorOperativoId]);

  useEffect(() => {
    if (
      beneficiarios.data?.items.length === 1 &&
      conceptoSeleccionado &&
      conceptoSeleccionado.modoSeleccionBeneficiario === 'CONFIGURADO' &&
      !['NO_APLICA', 'NOMBRE_LIBRE'].includes(
        conceptoSeleccionado.tipoBeneficiario,
      )
    ) {
      setBeneficiarioId(String(beneficiarios.data.items[0].id));
    }
  }, [beneficiarios.data, conceptoSeleccionado]);

  async function submit(form: HTMLFormElement) {
    if (submitting.current || uploadingRef.current || (archivoNombre && !archivoTemp && !pendingPayload.current)) return;
    setError('');

    if (!contextoSeleccionado && !pendingPayload.current) {
      setError('Seleccione un centro de costo de la lista.');
      return;
    }

    const values = new FormData(form);
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fecha);
    if (!match && !pendingPayload.current) { setError('Use fecha dd/mm/yyyy.'); return; }
    const periodoMatch = periodo ? /^(\d{2})-(\d{4})$/.exec(periodo) : null;
    if (
      periodo &&
      (!periodoMatch ||
        Number(periodoMatch[1]) < 1 ||
        Number(periodoMatch[1]) > 12) &&
      !pendingPayload.current
    ) {
      setError('Use período MM-YYYY.');
      return;
    }

    if (!conceptoSeleccionado && !pendingPayload.current) {
      setError('Seleccione un subtipo válido.');
      return;
    }

    const tipoBeneficiario = conceptoSeleccionado?.tipoBeneficiario ?? 'NO_APLICA';
    const usoBeneficiario = conceptoSeleccionado?.usoBeneficiario ?? 'NO_APLICA';
    const modoSeleccionBeneficiario =
      conceptoSeleccionado?.modoSeleccionBeneficiario ?? 'NO_APLICA';

    if (
      !pendingPayload.current &&
      tipoBeneficiario === 'PROVEEDOR' &&
      modoSeleccionBeneficiario === 'AUTOCOMPLETE' &&
      beneficiarioId &&
      (!proveedorSeleccionado ||
        String(proveedorSeleccionado.id) !== beneficiarioId)
    ) {
      setError('Seleccione un proveedor válido de la lista.');
      return;
    }

    if (
      !pendingPayload.current &&
      usoBeneficiario === 'REQUERIDO' &&
      tipoBeneficiario === 'NOMBRE_LIBRE' &&
      !beneficiarioNombreLibre.trim()
    ) {
      setError('Ingrese el beneficiario.');
      return;
    }

    if (
      !pendingPayload.current &&
      usoBeneficiario === 'REQUERIDO' &&
      !['NO_APLICA', 'NOMBRE_LIBRE'].includes(tipoBeneficiario) &&
      !beneficiarioId
    ) {
      setError('Seleccione el beneficiario.');
      return;
    }

    const payload: OrdenPagoPayload = pendingPayload.current ?? {
      contenedorOperativoId: contextoSeleccionado!.contenedorOperativoId,
      fechaEmision: `${match![3]}-${match![2]}-${match![1]}`,
      monto: String(values.get('monto')),
      moneda: String(values.get('moneda')),
      conceptoCodigo,
      observacion: String(values.get('observacion') ?? '').trim() || null,
      periodoAnio: periodoMatch ? Number(periodoMatch[2]) : null,
      periodoMes: periodoMatch ? Number(periodoMatch[1]) : null,
      codigoPago: codigoPago.trim() || null,
      proveedorId:
        tipoBeneficiario === 'PROVEEDOR' && beneficiarioId
          ? Number(beneficiarioId)
          : null,
      beneficiarioClienteDestinoId:
        tipoBeneficiario === 'CLIENTE_DESTINO' && beneficiarioId
          ? Number(beneficiarioId)
          : null,
      beneficiarioUsuarioId:
        tipoBeneficiario === 'USUARIO' && beneficiarioId
          ? Number(beneficiarioId)
          : null,
      beneficiarioNombreLibre:
        tipoBeneficiario === 'NOMBRE_LIBRE'
          ? beneficiarioNombreLibre.trim() || null
          : null,
      ...(archivoTemp ? { tempId: archivoTemp.tempId } : {}),
    };
    key.current ??= crypto.randomUUID();
    submitting.current = true;
    setBusy(true);
    try {
      const result = await crearOrdenPago(payload, key.current);
      pendingPayload.current = null; key.current = null; setRetry(false);
      form.reset();
      setConceptoCodigo('');
      setClasificacion('');
      setPeriodo(periodoNegocio());
      setCodigoPago('');
      setBeneficiarioId('');
      setBeneficiarioNombreLibre('');
      setProveedorTexto('');
      setProveedorSeleccionado(null);
      setFecha(fechaNegocio());
      setContextoTexto('');
      setContextoSeleccionado(null);
      quitarArchivo();
      dialog.current?.close(); setOpen(false); onCreated(result.ordenPagoId);
    } catch (e: unknown) {
      const response = (e as { response?: { status?: number; data?: { message?: string | string[] } } }).response;
      const message = response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'No se pudo confirmar la creación. Reintente con la misma solicitud.');
      // Un timeout puede ocurrir después del commit. Conserva clave y payload hasta resolverlo.
      // Con TEMP, incluso un 409 de verificación puede llegar después de T1.
      if (payload.tempId || !response || (response.status ?? 500) >= 500) { pendingPayload.current = payload; setRetry(true); }
    } finally { submitting.current = false; setBusy(false); }
  }

  return <>
    <Button onClick={() => { setOpen(true); dialog.current?.showModal(); }}>+ Agregar Orden de Pago</Button>
    <dialog ref={dialog} aria-labelledby="op-title" className="m-auto w-[min(95vw,760px)] rounded-xl border bg-background p-6 text-foreground shadow-xl backdrop:bg-black/40"
      onCancel={e => { if (submitting.current) e.preventDefault(); }} onClose={() => {
        setOpen(false);
        if (!pendingPayload.current) quitarArchivo();
      }}>
      <h2 id="op-title" className="mb-4 text-xl font-semibold">Agregar Orden de Pago</h2>
      <form onSubmit={e => { e.preventDefault(); void submit(e.currentTarget); }} className="space-y-3">
        <fieldset disabled={busy || retry} className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="op-centro-costo" className="block">
              Centro de costo *
            </label>

            <Input
              id="op-centro-costo"
              autoComplete="off"
              placeholder="Buscar por código o nombre..."
              value={contextoTexto}
              onChange={(event) => {
                setContextoTexto(event.target.value);

                if (contextoSeleccionado) {
                  setContextoSeleccionado(null);
                }
              }}
            />

            {contextoTexto.trim().length > 0 &&
              contextoTexto.trim().length < 2 ? (
                <p className="text-xs text-muted-foreground">
                  Escriba al menos 2 caracteres para buscar.
                </p>
              ) : null}

            {contextos.isFetching ? (
              <p className="text-sm text-muted-foreground">
                Buscando...
              </p>
            ) : null}

            {contextos.isError ? (
              <div className="text-sm text-red-600">
                <p>No se pudieron buscar los centros de costo.</p>
                <button
                  type="button"
                  className="underline"
                  onClick={() => void contextos.refetch()}
                >
                  Reintentar
                </button>
              </div>
            ) : null}

            {contextoQuery.length >= 2 &&
              !contextos.isFetching &&
              !contextos.isError &&
              contextos.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin coincidencias.
                </p>
              ) : null}

            {!contextoSeleccionado &&
              contextoQuery.length >= 2 &&
              contextos.data &&
              contextos.data.length > 0 ? (
                <div className="max-h-56 overflow-y-auto rounded-md border bg-background shadow-sm">
                  {contextos.data.slice(0, 10).map((contexto) => (
                    <button
                      key={contexto.contenedorOperativoId}
                      type="button"
                      className="flex w-full items-start px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setContextoSeleccionado(contexto);
                        setContextoTexto(
                          `${contexto.codigo} — ${contexto.descripcion || 'Sin descripción'}`,
                        );
                      }}
                    >
                      <span>
                        <span className="font-medium">
                          {contexto.codigo}
                        </span>
                        {' — '}
                        {contexto.descripcion || 'Sin descripción'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

            {contextoSeleccionado ? (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">
                  {contextoSeleccionado.codigo} —{' '}
                  {contextoSeleccionado.descripcion || 'Sin descripción'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Centro de costo seleccionado
                </p>
              </div>
            ) : contextoTexto.trim().length >= 2 ? (
              <p className="text-xs text-amber-700">
                Seleccione una coincidencia válida para continuar.
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              Tipo
              <select
                required
                value={clasificacion}
                onChange={e => {
                  const siguienteClasificacion = e.target.value;
                  const conceptosDelTipo =
                    opciones.data?.conceptos.filter(
                      concepto => concepto.clasificacion === siguienteClasificacion,
                    ) ?? [];

                  setClasificacion(siguienteClasificacion);
                  setBeneficiarioId('');
                  setBeneficiarioNombreLibre('');
                  setProveedorTexto('');
                  setProveedorSeleccionado(null);
                  setCodigoPago('');
                  setConceptoCodigo(
                    conceptosDelTipo.length === 1 ? conceptosDelTipo[0].codigo : '',
                  );
                }}
                className="block w-full rounded border bg-background p-2"
              >
                <option value="" disabled>Seleccione tipo</option>
                {Array.from(
                  new Set(opciones.data?.conceptos.map(concepto => concepto.clasificacion) ?? []),
                ).map(tipo => (
                  <option key={tipo} value={tipo}>
                    {tipo.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              Subtipo
              <select
                required
                value={conceptoCodigo}
                onChange={e => {
                  setBeneficiarioId('');
                  setBeneficiarioNombreLibre('');
                  setProveedorTexto('');
                  setProveedorSeleccionado(null);
                  setCodigoPago('');
                  setConceptoCodigo(e.target.value);
                }}
                disabled={!clasificacion}
                className="block w-full rounded border bg-background p-2"
              >
                <option value="" disabled>Seleccione subtipo</option>
                {opciones.data?.conceptos
                  .filter(concepto => concepto.clasificacion === clasificacion)
                  .map(concepto => (
                    <option key={concepto.codigo} value={concepto.codigo}>
                      {concepto.nombre}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              Período (opcional)
              <div className="flex items-center gap-2">
                <div className="op-flatpickr-field relative flex-1">
                  <Input
                    ref={periodoInput}
                    type="text"
                    placeholder="MM-YYYY"
                    defaultValue={periodo}
                    readOnly
                    aria-label="Período MM-YYYY"
                    className="cursor-pointer pr-10"
                    onClick={() => periodoPicker.current?.open()}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Abrir calendario de período"
                    className="absolute right-0 top-0"
                    onClick={() => periodoPicker.current?.open()}
                  >
                    <CalendarDays className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    periodoPicker.current?.clear();
                    setPeriodo('');
                  }}
                  disabled={!periodo}
                >
                  Limpiar
                </Button>
              </div>
            </label>

            {conceptoSeleccionado?.usoCodigoPago !== 'NO_APLICA' ? (
              <label className="block">
                Referencia{conceptoSeleccionado?.usoCodigoPago === 'REQUERIDO' ? ' *' : ''}
                <Input
                  value={codigoPago}
                  onChange={e => setCodigoPago(e.target.value)}
                  required={conceptoSeleccionado?.usoCodigoPago === 'REQUERIDO'}
                  maxLength={250}
                />
              </label>
            ) : <div />}

            {conceptoSeleccionado?.tipoBeneficiario === 'NOMBRE_LIBRE' ? (
              <label className="block md:col-span-2">
                Beneficiario{conceptoSeleccionado.usoBeneficiario === 'REQUERIDO' ? ' *' : ''}
                <Input
                  value={beneficiarioNombreLibre}
                  onChange={e => setBeneficiarioNombreLibre(e.target.value)}
                  required={conceptoSeleccionado.usoBeneficiario === 'REQUERIDO'}
                  maxLength={250}
                  placeholder="Nombre completo"
                />
              </label>
            ) : null}

            {conceptoSeleccionado?.tipoBeneficiario === 'PROVEEDOR' &&
            conceptoSeleccionado.modoSeleccionBeneficiario === 'AUTOCOMPLETE' ? (
              <div className="relative block md:col-span-2">
                <label className="block">
                  Beneficiario{conceptoSeleccionado.usoBeneficiario === 'REQUERIDO' ? ' *' : ''}
                  <Input
                    value={proveedorTexto}
                    onChange={e => {
                      setProveedorTexto(e.target.value);
                      setProveedorSeleccionado(null);
                      setBeneficiarioId('');
                    }}
                    required={conceptoSeleccionado.usoBeneficiario === 'REQUERIDO'}
                    placeholder="Buscar por RUC o razón social"
                    autoComplete="off"
                  />
                </label>

                {!proveedorSeleccionado &&
                proveedorQuery.length >= 2 &&
                proveedores.data?.length ? (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow-lg">
                    {proveedores.data.map(proveedor => (
                      <button
                        key={proveedor.id}
                        type="button"
                        className="block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                        onClick={() => {
                          setProveedorSeleccionado(proveedor);
                          setBeneficiarioId(String(proveedor.id));
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

                {proveedores.isLoading ? (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Buscando proveedores...
                  </span>
                ) : null}

                {proveedores.isError ? (
                  <span className="mt-1 block text-xs text-red-600">
                    No se pudieron buscar los proveedores.
                  </span>
                ) : null}

                {!proveedorSeleccionado &&
                !proveedores.isLoading &&
                !proveedores.isError &&
                proveedorQuery.length >= 2 &&
                proveedores.data?.length === 0 ? (
                  <span className="mt-1 block text-xs text-amber-700">
                    No se encontró un proveedor del catálogo.
                  </span>
                ) : null}

                {proveedorSeleccionado ? (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Proveedor del catálogo seleccionado.
                  </span>
                ) : null}
              </div>
            ) : null}

            {conceptoSeleccionado &&
            conceptoSeleccionado.modoSeleccionBeneficiario === 'CONFIGURADO' &&
            !['NO_APLICA', 'NOMBRE_LIBRE'].includes(conceptoSeleccionado.tipoBeneficiario) ? (
              <label className="block md:col-span-2">
                Beneficiario{conceptoSeleccionado.usoBeneficiario === 'REQUERIDO' ? ' *' : ''}
                <select
                  value={beneficiarioId}
                  onChange={e => setBeneficiarioId(e.target.value)}
                  required={conceptoSeleccionado.usoBeneficiario === 'REQUERIDO'}
                  disabled={
                    !contextoSeleccionado ||
                    beneficiarios.isLoading ||
                    beneficiarios.isError
                  }
                  className="block w-full rounded border bg-background p-2"
                >
                  <option value="">
                    {!contextoSeleccionado
                      ? 'Seleccione primero un centro de costo'
                      : beneficiarios.isLoading
                        ? 'Cargando beneficiarios...'
                        : conceptoSeleccionado.usoBeneficiario === 'OPCIONAL'
                          ? 'Sin beneficiario'
                          : 'Seleccione beneficiario'}
                  </option>
                  {beneficiarios.data?.items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}{item.detalle ? ` — ${item.detalle}` : ''}
                    </option>
                  ))}
                </select>
                {beneficiarios.isError ? (
                  <span className="mt-1 block text-xs text-red-600">
                    No se pudieron cargar los beneficiarios habilitados.
                  </span>
                ) : null}
                {!beneficiarios.isLoading &&
                !beneficiarios.isError &&
                beneficiarios.data?.items.length === 0 ? (
                  <span className="mt-1 block text-xs text-amber-700">
                    No hay beneficiarios configurados para este subtipo y centro de costo.
                  </span>
                ) : null}
              </label>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">Fecha de emisión
              <div className="op-flatpickr-field relative">
                <Input
                  ref={fechaInput}
                  name="fecha"
                  required
                  type="text"
                  placeholder="dd/mm/yyyy"
                  value={fecha}
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
            <label className="block">Moneda<select name="moneda" required className="block w-full rounded border bg-background p-2" defaultValue="">
              <option value="" disabled>Seleccione moneda</option>
              {opciones.data?.monedas.map(m => <option key={m.codigo} value={m.codigo}>{m.nombre}</option>)}
            </select></label>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">Monto<Input name="monto" required type="number" min="0.01" max="999999999999.99" step="0.01" /></label>
          </div>
          <label className="block">Observación<textarea name="observacion" maxLength={2000} className="block w-full rounded border bg-background p-2" /></label>
          <div className="space-y-2">
            <label htmlFor="op-archivo-inicial" className="block">Archivo inicial / sustento (opcional)</label>
            <Input id="op-archivo-inicial" ref={fileInput} type="file" accept="application/pdf,image/jpeg,image/png"
              onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void seleccionarArchivo(file); }} />
            <p className="text-xs text-muted-foreground">PDF, JPG o PNG. Máximo 15 MB.</p>
            {archivoNombre && <p className="break-words text-sm">{archivoNombre}</p>}
            <p role="status" className="text-sm text-muted-foreground">
              {uploading ? 'Preparando archivo…' : archivoTemp ? 'Archivo preparado para guardar' : ''}
            </p>
            {archivoError && <p role="alert" className="text-sm text-red-600">{archivoError}</p>}
            {archivoNombre && <Button type="button" variant="outline" onClick={quitarArchivo}>Quitar archivo</Button>}
          </div>
        </fieldset>
        {opciones.isLoading && <p>Cargando opciones…</p>}
        {opciones.isError && <p role="alert">No se pudieron cargar las opciones. <button type="button" onClick={() => void opciones.refetch()}>Reintentar</button></p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => dialog.current?.close()}>Cerrar</Button>
          <Button
            type="submit"
            disabled={
              busy ||
              uploading ||
              (!!archivoNombre && !archivoTemp) ||
              (!retry && (!contextoSeleccionado || !opciones.data))
            }
          >
            {busy
              ? 'Guardando…'
              : retry
                ? 'Reintentar creación'
                : 'Crear Orden de Pago'}
          </Button>
        </div>
      </form>
    </dialog>
  </>;
}
