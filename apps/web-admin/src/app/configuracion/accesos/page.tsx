"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatText } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import {
  getPerfilesAcceso,
  getUsuariosAcceso,
  getUsuarioWorkspacesAcceso,
  type PerfilAcceso,
  type UsuarioAcceso,
  type WorkspaceAcceso,
} from "@/services/accesos-admin";
import { AlertTriangle, BriefcaseBusiness, Eye, ShieldCheck, UsersRound } from "lucide-react";

type TabId = "usuarios" | "perfiles" | "workspaces";

type DetailState =
  | { type: "usuario"; item: UsuarioAcceso }
  | { type: "perfil"; item: PerfilAcceso }
  | { type: "workspace"; item: WorkspaceAcceso }
  | null;

const PERFIL_PERMISOS_SUGERIDOS: Record<string, { menus: string[]; actions: string[] }> = {
  admin: {
    menus: ["documentos", "compras", "almacen", "finanzas", "revision_contable", "alertas", "proyectos", "caja_chica", "requerimientos"],
    actions: ["documentos.subir", "documentos.validar", "documentos.editar_ocr", "documentos.confirmar_ocr", "documentos.rechazar_ocr", "documentos.vincular_expediente", "ocr.confirmar", "ocr.rechazar", "alertas.crear", "alertas.resolver"],
  },
  compras: {
    menus: ["compras"],
    actions: ["documentos.subir", "documentos.validar", "documentos.editar_ocr", "documentos.confirmar_ocr", "documentos.rechazar_ocr", "documentos.vincular_expediente", "ocr.confirmar", "ocr.rechazar"],
  },
  almacen: {
    menus: ["almacen"],
    actions: ["documentos.subir", "documentos.validar", "documentos.editar_ocr", "documentos.confirmar_ocr", "documentos.rechazar_ocr", "documentos.vincular_expediente", "ocr.confirmar", "ocr.rechazar"],
  },
  finanzas: {
    menus: ["finanzas"],
    actions: ["documentos.subir", "documentos.validar", "documentos.editar_ocr", "documentos.confirmar_ocr", "documentos.rechazar_ocr", "documentos.vincular_expediente", "ocr.confirmar", "ocr.rechazar"],
  },
  contabilidad: {
    menus: ["revision_contable", "alertas"],
    actions: ["documentos.ver", "revision_contable.ver", "alertas.crear", "alertas.resolver"],
  },
  rrhh: { menus: [], actions: [] },
  consulta: { menus: ["documentos"], actions: ["documentos.ver"] },
};

function estadoVariant(estado?: string | null): "default" | "outline" {
  return estado === "activo" ? "default" : "outline";
}

function normalizarEstado(estado?: string | null) {
  return estado || "sin estado";
}

function nombreUsuario(usuario: Partial<UsuarioAcceso | WorkspaceAcceso>) {
  const nombres = "nombres" in usuario ? usuario.nombres : undefined;
  const apellidos = "apellidos" in usuario ? usuario.apellidos : undefined;
  const completo = [nombres, apellidos].filter(Boolean).join(" ").trim();
  return completo || ("usuario" in usuario ? usuario.usuario : null) || "—";
}

function workspaceId(workspace: WorkspaceAcceso) {
  return workspace.workspaceId ?? workspace.id ?? "—";
}

function empresa(workspace: WorkspaceAcceso) {
  return workspace.empresaCodigo ?? workspace.empresa_codigo ?? workspace.empresa ?? "—";
}

function clienteDestino(workspace: WorkspaceAcceso) {
  const id = workspace.clienteDestinoId ?? workspace.cliente_destino_id;
  const nombre = workspace.clienteAbreviatura ?? workspace.clienteNombre;
  if (id && nombre) return `${id} · ${nombre}`;
  return id ?? nombre ?? "—";
}

function sistema(workspace: WorkspaceAcceso | PerfilAcceso) {
  return workspace.sistemaNombre ?? workspace.sistemaCodigo ?? workspace.sistema ?? workspace.sistemaId ?? workspace.sistema_id ?? "—";
}

function perfil(workspace: WorkspaceAcceso) {
  return workspace.perfilNombre ?? workspace.perfil ?? workspace.perfilId ?? workspace.perfil_id ?? "—";
}

function permisos(workspace: WorkspaceAcceso) {
  return {
    menus: workspace.permisos?.menus ?? [],
    actions: workspace.permisos?.actions ?? [],
  };
}

function PermissionChips({ values, emptyLabel = "Sin permisos visibles" }: { values: string[]; emptyLabel?: string }) {
  if (!values.length) return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <Badge key={value} variant="outline" className="font-mono">
          {value}
        </Badge>
      ))}
    </div>
  );
}

function SummaryCard({ title, value, description, icon }: { title: string; value: number | string; description: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

function ErrorBox({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm">{description}</p>
      </div>
    </div>
  );
}

function DetailPanel({ detail, onClose }: { detail: DetailState; onClose: () => void }) {
  if (!detail) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm" role="dialog" aria-modal="true">
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-background p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Solo lectura</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {detail.type === "usuario" ? "Detalle de usuario" : detail.type === "perfil" ? "Detalle de perfil" : "Detalle de workspace"}
            </h2>
          </div>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>

        {detail.type === "usuario" ? <UsuarioDetalle usuario={detail.item} /> : null}
        {detail.type === "perfil" ? <PerfilDetalle perfil={detail.item} /> : null}
        {detail.type === "workspace" ? <WorkspaceDetalle workspace={detail.item} /> : null}
      </aside>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className={`mt-1 text-sm font-medium text-foreground ${mono ? "font-mono break-all" : ""}`}>{value || "—"}</div>
    </div>
  );
}

function UsuarioDetalle({ usuario }: { usuario: UsuarioAcceso }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <Field label="ID" value={usuario.id} mono />
      <Field label="Estado" value={<Badge variant={estadoVariant(usuario.estado)}>{normalizarEstado(usuario.estado)}</Badge>} />
      <Field label="Nombres" value={usuario.nombres} />
      <Field label="Apellidos" value={usuario.apellidos} />
      <Field label="Email" value={usuario.email} mono />
      <Field label="Creado en" value={formatDateTime(usuario.creadoEn ?? usuario.creado_en)} />
      <Field label="Actualizado en" value={formatDateTime(usuario.actualizadoEn ?? usuario.actualizado_en)} />
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 sm:col-span-2">
        No se muestran hashes de contraseña, tokens ni credenciales internas.
      </div>
    </div>
  );
}

function PerfilDetalle({ perfil }: { perfil: PerfilAcceso }) {
  const sugeridos = PERFIL_PERMISOS_SUGERIDOS[perfil.codigo] ?? { menus: perfil.menus ?? [], actions: perfil.actions ?? [] };

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="ID" value={perfil.id} mono />
        <Field label="Estado" value={<Badge variant={estadoVariant(perfil.estado)}>{normalizarEstado(perfil.estado)}</Badge>} />
        <Field label="Código" value={perfil.codigo} mono />
        <Field label="Nombre" value={perfil.nombre} />
        <Field label="Sistema" value={sistema(perfil)} />
        <Field label="Descripción" value={perfil.descripcion} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Menús esperados</CardTitle>
          <CardDescription>Referencia visual para el perfil. No editable en Fase 1.</CardDescription>
        </CardHeader>
        <CardContent><PermissionChips values={sugeridos.menus} /></CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Acciones esperadas</CardTitle>
          <CardDescription>Permisos técnicos de operación. No crean menús visibles.</CardDescription>
        </CardHeader>
        <CardContent><PermissionChips values={sugeridos.actions} /></CardContent>
      </Card>
    </div>
  );
}

function WorkspaceDetalle({ workspace }: { workspace: WorkspaceAcceso }) {
  const permisosWorkspace = permisos(workspace);

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Workspace ID" value={workspaceId(workspace)} mono />
        <Field label="Estado" value={<Badge variant={estadoVariant(workspace.estado)}>{normalizarEstado(workspace.estado)}</Badge>} />
        <Field label="Usuario" value={nombreUsuario(workspace)} />
        <Field label="Email" value={workspace.email} mono />
        <Field label="Empresa" value={empresa(workspace)} />
        <Field label="Cliente destino" value={clienteDestino(workspace)} />
        <Field label="Sistema" value={sistema(workspace)} />
        <Field label="Perfil" value={perfil(workspace)} />
        <Field label="Favorito" value={workspace.esFavorito ?? workspace.es_favorito ? "Sí" : "No"} />
        <Field label="Último uso" value={formatDateTime(workspace.ultimoUsoEn ?? workspace.ultimo_uso_en)} />
        <Field label="Versión permisos" value={workspace.permissionVersion ?? workspace.permission_version ?? "—"} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Menús visibles</CardTitle>
          <CardDescription>Estos valores controlan el sidebar del usuario.</CardDescription>
        </CardHeader>
        <CardContent><PermissionChips values={permisosWorkspace.menus} /></CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Acciones técnicas</CardTitle>
          <CardDescription>Permisos para botones, procesos y validaciones internas.</CardDescription>
        </CardHeader>
        <CardContent><PermissionChips values={permisosWorkspace.actions} /></CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Permisos JSON</CardTitle>
          <CardDescription>Solo lectura. No editar desde esta fase.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-50">
            {JSON.stringify(permisosWorkspace, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdministracionAccesosPage() {
  const { contexto } = useAuth();
  const [tab, setTab] = useState<TabId>("usuarios");
  const [detail, setDetail] = useState<DetailState>(null);

  const usuariosQuery = useQuery({ queryKey: ["admin-accesos", "usuarios"], queryFn: getUsuariosAcceso });
  const perfilesQuery = useQuery({ queryKey: ["admin-accesos", "perfiles"], queryFn: getPerfilesAcceso });
  const workspacesQuery = useQuery({ queryKey: ["admin-accesos", "workspaces"], queryFn: getUsuarioWorkspacesAcceso });

  const usuarios = usuariosQuery.data ?? [];
  const perfiles = perfilesQuery.data ?? [];
  const workspaces = workspacesQuery.data ?? [];

  const resumen = useMemo(() => {
    const usuariosActivos = usuarios.filter((usuario) => usuario.estado === "activo").length;
    const usuariosInactivos = usuarios.filter((usuario) => usuario.estado && usuario.estado !== "activo").length;
    const workspacesActivos = workspaces.filter((workspace) => workspace.estado === "activo").length;
    const empresas = new Set(workspaces.map(empresa).filter((value) => value && value !== "—"));

    return { usuariosActivos, usuariosInactivos, workspacesActivos, empresas: empresas.size };
  }, [usuarios, workspaces]);

  if (contexto && contexto.perfil !== "admin") {
    return (
      <main className="p-6">
        <ErrorBox title="Acceso restringido" description="Solo el perfil administrador puede visualizar Administración de Accesos." />
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Sistema</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Administración de Accesos</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Vista solo lectura para auditar usuarios, perfiles, workspaces y permisos asignados. No permite crear, editar ni exponer datos sensibles.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">Fase 1 · Solo lectura</Badge>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="Usuarios activos" value={resumen.usuariosActivos} description="Cuentas habilitadas" icon={<UsersRound className="h-5 w-5" />} />
        <SummaryCard title="Usuarios inactivos" value={resumen.usuariosInactivos} description="Cuentas deshabilitadas" icon={<UsersRound className="h-5 w-5" />} />
        <SummaryCard title="Perfiles" value={perfiles.length} description="Catálogo disponible" icon={<ShieldCheck className="h-5 w-5" />} />
        <SummaryCard title="Workspaces activos" value={resumen.workspacesActivos} description="Contextos operativos" icon={<BriefcaseBusiness className="h-5 w-5" />} />
        <SummaryCard title="Empresas" value={resumen.empresas} description="Con accesos asignados" icon={<BriefcaseBusiness className="h-5 w-5" />} />
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            {([
              ["usuarios", "Usuarios"],
              ["perfiles", "Perfiles"],
              ["workspaces", "Espacios de trabajo"],
            ] as Array<[TabId, string]>).map(([id, label]) => (
              <Button key={id} variant={tab === id ? "default" : "outline"} onClick={() => setTab(id)}>
                {label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {tab === "usuarios" ? (
            <UsuariosTable data={usuarios} loading={usuariosQuery.isLoading} error={usuariosQuery.isError} onView={(item) => setDetail({ type: "usuario", item })} />
          ) : null}
          {tab === "perfiles" ? (
            <PerfilesTable data={perfiles} loading={perfilesQuery.isLoading} error={perfilesQuery.isError} onView={(item) => setDetail({ type: "perfil", item })} />
          ) : null}
          {tab === "workspaces" ? (
            <WorkspacesTable data={workspaces} loading={workspacesQuery.isLoading} error={workspacesQuery.isError} onView={(item) => setDetail({ type: "workspace", item })} />
          ) : null}
        </CardContent>
      </Card>

      <DetailPanel detail={detail} onClose={() => setDetail(null)} />
    </main>
  );
}

function UsuariosTable({ data, loading, error, onView }: { data: UsuarioAcceso[]; loading: boolean; error: boolean; onView: (item: UsuarioAcceso) => void }) {
  if (loading) return <p className="py-8 text-sm text-muted-foreground">Cargando usuarios...</p>;
  if (error) return <ErrorBox title="No se pudo cargar usuarios" description="Verifica que exista GET /api/v1/auth/usuarios y que el usuario admin tenga sesión vigente." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Nombres</TableHead>
          <TableHead>Apellidos</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Creado</TableHead>
          <TableHead>Actualizado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((usuario) => (
          <TableRow key={usuario.id}>
            <TableCell className="font-mono">{usuario.id}</TableCell>
            <TableCell className="font-medium">{formatText(usuario.nombres)}</TableCell>
            <TableCell>{formatText(usuario.apellidos)}</TableCell>
            <TableCell className="font-mono text-xs">{usuario.email}</TableCell>
            <TableCell><Badge variant={estadoVariant(usuario.estado)}>{normalizarEstado(usuario.estado)}</Badge></TableCell>
            <TableCell>{formatDateTime(usuario.creadoEn ?? usuario.creado_en)}</TableCell>
            <TableCell>{formatDateTime(usuario.actualizadoEn ?? usuario.actualizado_en)}</TableCell>
            <TableCell><Button variant="outline" size="sm" onClick={() => onView(usuario)}><Eye className="h-3.5 w-3.5" /> Ver detalle</Button></TableCell>
          </TableRow>
        ))}
        {!data.length ? (
          <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No hay usuarios para mostrar.</TableCell></TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}

function PerfilesTable({ data, loading, error, onView }: { data: PerfilAcceso[]; loading: boolean; error: boolean; onView: (item: PerfilAcceso) => void }) {
  if (loading) return <p className="py-8 text-sm text-muted-foreground">Cargando perfiles...</p>;
  if (error) return <ErrorBox title="No se pudo cargar perfiles" description="Verifica que exista GET /api/v1/auth/perfiles." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Código</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Sistema</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((perfilItem) => (
          <TableRow key={perfilItem.id}>
            <TableCell className="font-mono">{perfilItem.id}</TableCell>
            <TableCell><Badge variant="outline" className="font-mono">{perfilItem.codigo}</Badge></TableCell>
            <TableCell className="font-medium">{perfilItem.nombre}</TableCell>
            <TableCell>{sistema(perfilItem)}</TableCell>
            <TableCell><Badge variant={estadoVariant(perfilItem.estado)}>{normalizarEstado(perfilItem.estado)}</Badge></TableCell>
            <TableCell><Button variant="outline" size="sm" onClick={() => onView(perfilItem)}><Eye className="h-3.5 w-3.5" /> Ver detalle</Button></TableCell>
          </TableRow>
        ))}
        {!data.length ? (
          <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No hay perfiles para mostrar.</TableCell></TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}

function WorkspacesTable({ data, loading, error, onView }: { data: WorkspaceAcceso[]; loading: boolean; error: boolean; onView: (item: WorkspaceAcceso) => void }) {
  if (loading) return <p className="py-8 text-sm text-muted-foreground">Cargando espacios de trabajo...</p>;
  if (error) return <ErrorBox title="No se pudo cargar workspaces" description="Verifica que exista GET /api/v1/auth/usuario-workspaces." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Workspace ID</TableHead>
          <TableHead>Usuario</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Empresa</TableHead>
          <TableHead>Cliente destino</TableHead>
          <TableHead>Sistema</TableHead>
          <TableHead>Perfil</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Favorito</TableHead>
          <TableHead>Último uso</TableHead>
          <TableHead>Permisos</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((workspace) => {
          const workspacePermisos = permisos(workspace);
          return (
            <TableRow key={String(workspaceId(workspace))}>
              <TableCell className="font-mono">{workspaceId(workspace)}</TableCell>
              <TableCell className="font-medium">{nombreUsuario(workspace)}</TableCell>
              <TableCell className="font-mono text-xs">{formatText(workspace.email)}</TableCell>
              <TableCell>{empresa(workspace)}</TableCell>
              <TableCell>{clienteDestino(workspace)}</TableCell>
              <TableCell>{sistema(workspace)}</TableCell>
              <TableCell><Badge variant="outline">{perfil(workspace)}</Badge></TableCell>
              <TableCell><Badge variant={estadoVariant(workspace.estado)}>{normalizarEstado(workspace.estado)}</Badge></TableCell>
              <TableCell>{workspace.esFavorito ?? workspace.es_favorito ? "Sí" : "No"}</TableCell>
              <TableCell>{formatDateTime(workspace.ultimoUsoEn ?? workspace.ultimo_uso_en)}</TableCell>
              <TableCell>{workspacePermisos.menus.length} menús · {workspacePermisos.actions.length} acciones</TableCell>
              <TableCell><Button variant="outline" size="sm" onClick={() => onView(workspace)}><Eye className="h-3.5 w-3.5" /> Ver permisos</Button></TableCell>
            </TableRow>
          );
        })}
        {!data.length ? (
          <TableRow><TableCell colSpan={12} className="py-8 text-center text-muted-foreground">No hay workspaces para mostrar.</TableCell></TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}
