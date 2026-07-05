import Link from "next/link";
import type { ReactNode } from "react";
import { FileText, Eye } from "lucide-react";
import { DocumentStatusBadge } from "@/components/common/DocumentStatusBadge";
import { formatCurrency, formatDate, formatDocumentNumber, formatText } from "@/lib/format";
import { cn } from "@/lib/utils";

export type DocumentCardModel = {
  id?: number | string | null;
  documentoId?: number | string | null;
  tipoDocumental?: string | null;
  tipo_documental?: string | null;
  serie?: string | null;
  numero?: string | null;
  razonSocialEmisor?: string | null;
  razon_social_emisor?: string | null;
  rucEmisor?: string | null;
  ruc_emisor?: string | null;
  fechaEmision?: string | null;
  fecha_emision?: string | null;
  montoTotal?: number | string | null;
  monto_total?: number | string | null;
  moneda?: string | null;
  estado?: string | null;
};

type DocumentCardProps = {
  documento: DocumentCardModel;
  href?: string;
  className?: string;
  actions?: ReactNode;
};

function getId(documento: DocumentCardModel) {
  return documento.documentoId ?? documento.id;
}

export function DocumentCard({ documento, href, className, actions }: DocumentCardProps) {
  const id = getId(documento);
  const tipo = documento.tipoDocumental ?? documento.tipo_documental ?? "Documento";
  const emisor = documento.razonSocialEmisor ?? documento.razon_social_emisor;
  const ruc = documento.rucEmisor ?? documento.ruc_emisor;
  const fecha = documento.fechaEmision ?? documento.fecha_emision;
  const monto = documento.montoTotal ?? documento.monto_total;
  const target = href ?? (id ? `/documentos/${id}` : undefined);

  return (
    <article className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{tipo}</p>
            <h3 className="mt-1 truncate text-base font-semibold text-slate-950 dark:text-white">
              {formatDocumentNumber(documento.serie, documento.numero)}
            </h3>
          </div>
        </div>
        <DocumentStatusBadge estado={documento.estado} />
      </div>

      <dl className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-slate-400">Emisor</dt>
          <dd className="mt-1 truncate font-medium text-slate-800 dark:text-slate-100">{formatText(emisor)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-400">RUC</dt>
          <dd className="mt-1">{formatText(ruc)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-400">Fecha</dt>
          <dd className="mt-1">{formatDate(fecha)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-400">Monto</dt>
          <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(monto, documento.moneda ?? "PEN")}</dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-white/10">
        {target ? (
          <Link href={target} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:underline dark:text-white">
            <Eye className="h-4 w-4" aria-hidden="true" />
            Ver documento
          </Link>
        ) : <span />}
        {actions}
      </div>
    </article>
  );
}
