"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  ReceiptText,
  Search,
  ShoppingCart,
} from "lucide-react";

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
import {
  buscarExpedientes,
  crearExpediente,
  type ExpedienteSearchResult,
} from "@/services/expedientes";

type TipoInicio = "OC" | "OS" | "FACTURA";

type OpcionInicio = {
  tipo: TipoInicio;
  title: string;
  description: string;
  icon: typeof ShoppingCart;
  tipoRelacionPrincipal: "principal_oc" | "principal_os" | "principal_factura";
  codigoHint: string;
  codigoPrefix?: string;
};

const OPTIONS: OpcionInicio[] = [
  {
    tipo: "OC",
    title: "Orden de Compra",
    description: "Registrar una OC y asociarla a una OP / PR con código 05*.",
    icon: ShoppingCart,
    tipoRelacionPrincipal: "principal_oc",
    codigoHint: "Ejemplo: 050201",
    codigoPrefix: "05",
  },
  {
    tipo: "OS",
    title: "Orden de Servicio",
    description: "Registrar una OS y asociarla a un centro de costo con código 03*.",
    icon: FileText,
    tipoRelacionPrincipal: "principal_os",
    codigoHint: "Ejemplo: 030120",
    codigoPrefix: "03",
  },
  {
    tipo: "FACTURA",
    title: "Factura directa",
    description: "Registrar una factura sin OC/OS como gasto directo.",
    icon: ReceiptText,
    tipoRelacionPrincipal: "principal_factura",
    codigoHint: "Ejemplo: GD-2026-001 o 050201",
  },
];

const CLIENTES = [
  {
    label: "BBTI · BB TECNOLOGIA INDUSTRIAL S.A.C.",
    empresaCodigo: "BBTI",
    clienteDestinoId: 2,
  },
];

function getErrorMessage(error: unknown) {
  const data = (error as any)?.response?.data;
  return (
    data?.error?.message ??
    data?.message ??
    (error instanceof Error ? error.message : null) ??
    "No se pudo completar la operación"
  );
}

function expedienteLabel(expediente: ExpedienteSearchResult) {
  return [
    `#${expediente.id}`,
    expediente.codigoExpediente,
    expediente.descripcion,
    expediente.empresaCodigo,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function NuevoExpedienteWizard() {
  const router = useRouter();
  const [selectedTipo, setSelectedTipo] = useState<TipoInicio>("OC");
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ExpedienteSearchResult[]>([]);
  const [expedienteSeleccionado, setExpedienteSeleccionado] =
    useState<ExpedienteSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [codigoExpediente, setCodigoExpediente] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [clienteKey, setClienteKey] = useState("BBTI");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedOption = useMemo(
    () => OPTIONS.find((option) => option.tipo === selectedTipo) ?? OPTIONS[0],
    [selectedTipo],
  );

  const selectedCliente = useMemo(
    () => CLIENTES.find((cliente) => cliente.empresaCodigo === clienteKey) ?? CLIENTES[0],
    [clienteKey],
  );

  const codigoNormalizado = codigoExpediente.trim().toUpperCase();
  const codigoPrefixWarning =
    selectedOption.codigoPrefix && codigoNormalizado && !codigoNormalizado.startsWith(selectedOption.codigoPrefix)
      ? `Para ${selectedOption.title}, el código normalmente inicia con ${selectedOption.codigoPrefix}.`
      : null;

  useEffect(() => {
    const term = query.trim();
    setError(null);

    if (term.length < 2) {
      setResultados([]);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const timer = window.setTimeout(async () => {
      try {
        const data = await buscarExpedientes(term, 10);
        if (!cancelled) {
          setResultados(data);
        }
      } catch (searchError) {
        if (!cancelled) {
          setError(getErrorMessage(searchError));
          setResultados([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  function handleSelectExpediente(expediente: ExpedienteSearchResult) {
    setExpedienteSeleccionado(expediente);
    setQuery(expedienteLabel(expediente));
    setResultados([]);
    setError(null);
  }

  function handleContinuar() {
    setError(null);

    if (!expedienteSeleccionado?.id) {
      setError("Selecciona un expediente existente para continuar.");
      return;
    }

    setIsContinuing(true);
    router.push(`/compras/${expedienteSeleccionado.id}/editar`);
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!codigoNormalizado) {
      setError("Ingresa el código de expediente.");
      return;
    }

    setIsSubmitting(true);

    try {
      const expediente = await crearExpediente({
        clienteDestinoId: selectedCliente.clienteDestinoId,
        empresaCodigo: selectedCliente.empresaCodigo,
        codigoExpediente: codigoNormalizado,
        descripcion: descripcion.trim() || null,
        metadata: {
          modulo: "COMPRAS",
          tipoInicio: selectedOption.tipo,
          tipoRelacionPrincipal: selectedOption.tipoRelacionPrincipal,
          creadoDesde: "compras_nuevo",
        },
      });

      const id = (expediente as any)?.id ?? (expediente as any)?.expediente?.id;

      if (!id) {
        throw new Error("El backend no devolvió el id del expediente creado.");
      }

      router.push(`/compras/${id}/editar`);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 px-0">
          <Link href="/compras">
            <ArrowLeft className="h-4 w-4" />
            Volver a compras
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Iniciar carga documental de compras</h1>
        <p className="text-sm text-muted-foreground">
          Selecciona el tipo de inicio y busca un expediente existente antes de cargar documentos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedOption.tipo === option.tipo;

          return (
            <button
              key={option.tipo}
              type="button"
              onClick={() => setSelectedTipo(option.tipo)}
              className={`rounded-xl text-left transition ${
                isSelected ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/40"
              }`}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>{option.title}</CardTitle>
                    {isSelected ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                  <div className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                    Principal sugerido: {option.tipoRelacionPrincipal}
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Buscar expediente existente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase text-muted-foreground">
                Código, descripción, empresa o cliente
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setExpedienteSeleccionado(null);
                  }}
                  placeholder="Buscar 050201, PRODUCCION, BBTI..."
                  className="pl-9"
                  disabled={isContinuing}
                />
              </div>
            </div>

            {isSearching ? (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando expedientes...
              </div>
            ) : null}

            {resultados.length > 0 ? (
              <div className="overflow-hidden rounded-xl border">
                {resultados.map((expediente) => (
                  <button
                    key={String(expediente.id)}
                    type="button"
                    onClick={() => handleSelectExpediente(expediente)}
                    className="block w-full border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          #{expediente.id} · {expediente.codigoExpediente}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {expediente.descripcion ?? "Sin descripción"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {expediente.empresaCodigo} · {expediente.clienteNombre ?? expediente.clienteAbreviatura ?? "Cliente no informado"}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{expediente.documentos ?? 0} documentos</p>
                        <p>{expediente.alertas ?? 0} alertas</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : query.trim().length >= 2 && !isSearching && !expedienteSeleccionado ? (
              <div className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
                No se encontraron expedientes con ese criterio.
              </div>
            ) : null}

            {expedienteSeleccionado ? (
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">Expediente seleccionado</p>
                <p className="mt-1 font-semibold">
                  #{expedienteSeleccionado.id} · {expedienteSeleccionado.codigoExpediente}
                </p>
                <p className="text-sm text-muted-foreground">
                  {expedienteSeleccionado.descripcion ?? "Sin descripción"}
                </p>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                  <div>
                    <span className="font-medium text-foreground">Empresa:</span> {expedienteSeleccionado.empresaCodigo}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Cliente:</span> {expedienteSeleccionado.clienteNombre ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Documentos:</span> {expedienteSeleccionado.documentos ?? 0}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Alertas:</span> {expedienteSeleccionado.alertas ?? 0}
                  </div>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <Button asChild type="button" variant="outline">
                <Link href="/compras">Cancelar</Link>
              </Button>
              <Button type="button" onClick={handleContinuar} disabled={isContinuing || !expedienteSeleccionado}>
                {isContinuing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continuar con expediente
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flujo seleccionado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Inicio</p>
              <p className="font-medium">{selectedOption.title}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Relación principal</p>
              <p className="font-mono text-xs">{selectedOption.tipoRelacionPrincipal}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Siguiente paso</p>
              <p className="text-muted-foreground">
                Al continuar, se abrirá Compras &gt; Editar para cargar el PDF principal y sus adjuntos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            No encuentro el expediente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Crear expediente nuevo es una opción secundaria. Antes de crear, busca por código, descripción y empresa.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowCreateNew((value) => !value)}
          >
            {showCreateNew ? "Ocultar creación manual" : "Crear expediente nuevo"}
          </Button>

          {showCreateNew ? (
            <form onSubmit={handleCreateSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase text-muted-foreground">
                      Empresa / cliente
                    </label>
                    <Select value={clienteKey} onValueChange={setClienteKey}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLIENTES.map((cliente) => (
                          <SelectItem key={cliente.empresaCodigo} value={cliente.empresaCodigo}>
                            {cliente.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase text-muted-foreground">
                      Código expediente
                    </label>
                    <Input
                      value={codigoExpediente}
                      onChange={(event) => setCodigoExpediente(event.target.value)}
                      placeholder={selectedOption.codigoHint}
                      disabled={isSubmitting}
                    />
                    {codigoPrefixWarning ? (
                      <p className="text-xs text-amber-600">{codigoPrefixWarning}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase text-muted-foreground">
                    Descripción
                  </label>
                  <textarea
                    value={descripcion}
                    onChange={(event) => setDescripcion(event.target.value)}
                    placeholder="Ejemplo: PRODUCCION C X DISTRIBUIR"
                    disabled={isSubmitting}
                    rows={4}
                    className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="flex items-end justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Crear y continuar
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
