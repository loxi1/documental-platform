"use client";

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  buscarContextosOrdenPago,
  crearOrdenPago,
  getOpcionesOrdenPago,
} from '@/services/finanzas';
import type {
  ContextoOrdenPago,
  OrdenPagoPayload,
} from '@/services/finanzas';

function fechaNegocio() {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
}
const label = (s: string) => s.replaceAll('_', ' ');

export function CrearOrdenPagoModal({ workspaceId, onCreated }: { workspaceId: number; onCreated: (id: number) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const key = useRef<string | null>(null);
  const pendingPayload = useRef<OrdenPagoPayload | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fecha, setFecha] = useState(fechaNegocio);
  const [tipo, setTipo] = useState('');
  const [retry, setRetry] = useState(false);

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

  async function submit(form: HTMLFormElement) {
    setError('');

    if (!contextoSeleccionado && !pendingPayload.current) {
      setError('Seleccione un centro de costo de la lista.');
      return;
    }

    const values = new FormData(form);
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fecha);
    if (!match && !pendingPayload.current) { setError('Use fecha dd/mm/yyyy.'); return; }
    const payload = pendingPayload.current ?? {
      contenedorOperativoId: contextoSeleccionado!.contenedorOperativoId,
      fechaEmision: `${match![3]}-${match![2]}-${match![1]}`,
      monto: String(values.get('monto')), moneda: String(values.get('moneda')),
      tipo, subtipo: String(values.get('subtipo') ?? '') || null,
      observacion: String(values.get('observacion') ?? '').trim() || null,
    };
    key.current ??= crypto.randomUUID();
    setBusy(true);
    try {
      const result = await crearOrdenPago(payload, key.current);
      pendingPayload.current = null; key.current = null; setRetry(false);
      form.reset();
      setTipo('');
      setFecha(fechaNegocio());
      setContextoTexto('');
      setContextoSeleccionado(null);
      dialog.current?.close(); setOpen(false); onCreated(result.ordenPagoId);
    } catch (e: unknown) {
      const response = (e as { response?: { status?: number; data?: { message?: string | string[] } } }).response;
      const message = response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'No se pudo confirmar la creación. Reintente con la misma solicitud.');
      // Un timeout puede ocurrir después del commit. Conserva clave y payload hasta resolverlo.
      if (!response || (response.status ?? 500) >= 500) { pendingPayload.current = payload; setRetry(true); }
    } finally { setBusy(false); }
  }

  return <>
    <Button onClick={() => { setOpen(true); dialog.current?.showModal(); }}>+ Agregar Orden de Pago</Button>
    <dialog ref={dialog} aria-labelledby="op-title" className="m-auto w-[min(95vw,560px)] rounded-xl border bg-background p-6 text-foreground shadow-xl backdrop:bg-black/40"
      onCancel={e => { if (busy) e.preventDefault(); }} onClose={() => setOpen(false)}>
      <h2 id="op-title" className="mb-4 text-xl font-semibold">Agregar Orden de Pago</h2>
      <form onSubmit={e => { e.preventDefault(); void submit(e.currentTarget); }} className="space-y-3">
        <fieldset disabled={busy || retry} className="space-y-3">
          <label className="block">Fecha de emisión
            <Input name="fecha" required placeholder="dd/mm/yyyy" value={fecha} onChange={e => setFecha(e.target.value)} pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" />
          </label>
          <label className="block">Monto<Input name="monto" required type="number" min="0.01" max="999999999999.99" step="0.01" /></label>
          <label className="block">Moneda<select name="moneda" required className="block w-full rounded border bg-background p-2" defaultValue="">
            <option value="" disabled>Seleccione moneda</option>
            {opciones.data?.monedas.map(m => <option key={m.codigo} value={m.codigo}>{m.nombre}</option>)}
          </select></label>
          <label className="block">Tipo<select required value={tipo} onChange={e => setTipo(e.target.value)} className="block w-full rounded border bg-background p-2">
            <option value="" disabled>Seleccione tipo</option>
            {Object.keys(opciones.data?.tipos ?? {}).map(t => <option key={t} value={t}>{label(t)}</option>)}
          </select></label>
          {!!opciones.data?.tipos[tipo]?.length && <label className="block">Subtipo<select key={tipo} name="subtipo" required defaultValue="" className="block w-full rounded border bg-background p-2">
            <option value="" disabled>Seleccione subtipo</option>
            {opciones.data.tipos[tipo].map(t => <option key={t} value={t}>{label(t)}</option>)}
          </select></label>}
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
          <label className="block">Observación<textarea name="observacion" maxLength={2000} className="block w-full rounded border bg-background p-2" /></label>
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
