import Link from "next/link";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

type VerDocumentoProps = {
  documentoId: number | string;
  label?: string;
  className?: string;
};

export function VerDocumento({ documentoId, label = "Ver documento", className }: VerDocumentoProps) {
  return (
    <Link
      href={`/documentos/${documentoId}`}
      className={cn("inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10", className)}
    >
      <Eye className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
