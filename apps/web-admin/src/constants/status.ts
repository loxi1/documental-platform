import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type DocumentoEstado =
  | "pendiente"
  | "procesando"
  | "pendiente_validacion"
  | "confirmado"
  | "rechazado"
  | "error"
  | "subido"
  | "activo";

export type EstadoVisual = {
  label: string;
  icon: LucideIcon;
  className: string;
};

const baseBadge = "border px-2.5 py-1 text-xs font-semibold";

export const DOCUMENT_STATUS: Record<DocumentoEstado, EstadoVisual> = {
  pendiente: {
    label: "Pendiente",
    icon: Clock3,
    className: `${baseBadge} border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200`,
  },
  procesando: {
    label: "Procesando",
    icon: Loader2,
    className: `${baseBadge} border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200`,
  },
  pendiente_validacion: {
    label: "Pendiente de validación",
    icon: AlertTriangle,
    className: `${baseBadge} border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200`,
  },
  confirmado: {
    label: "Confirmado",
    icon: CheckCircle2,
    className: `${baseBadge} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200`,
  },
  rechazado: {
    label: "Rechazado",
    icon: XCircle,
    className: `${baseBadge} border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200`,
  },
  error: {
    label: "Error",
    icon: XCircle,
    className: `${baseBadge} border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200`,
  },
  subido: {
    label: "Subido",
    icon: FileCheck2,
    className: `${baseBadge} border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200`,
  },
  activo: {
    label: "Activo",
    icon: CheckCircle2,
    className: `${baseBadge} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200`,
  },
};

export const DEFAULT_DOCUMENT_STATUS: EstadoVisual = {
  label: "Sin estado",
  icon: Clock3,
  className: `${baseBadge} border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300`,
};

export function normalizeStatus(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_") as DocumentoEstado;
}

export function getDocumentStatus(value?: string | null) {
  const normalized = normalizeStatus(value);
  return DOCUMENT_STATUS[normalized] ?? {
    ...DEFAULT_DOCUMENT_STATUS,
    label: value ? String(value).replace(/_/g, " ") : DEFAULT_DOCUMENT_STATUS.label,
  };
}
