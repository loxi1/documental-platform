"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { getDocumentoArchivoPreviewUrl, type DocumentoArchivoPreview } from "@/services/documentos-preview";
import { cn } from "@/lib/utils";

type PreviewDocumentoProps = {
  archivoId: number | string;
  title?: string;
  className?: string;
};

export function PreviewDocumento({ archivoId, title = "Vista previa del documento", className }: PreviewDocumentoProps) {
  const [preview, setPreview] = useState<DocumentoArchivoPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPreview() {
      try {
        setLoading(true);
        setError(null);
        const result = await getDocumentoArchivoPreviewUrl(archivoId);
        if (active) setPreview(result);
      } catch {
        if (active) setError("No se pudo generar la vista previa del documento.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPreview();

    return () => {
      active = false;
    };
  }, [archivoId]);

  if (loading) {
    return (
      <div className={cn("flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03]", className)}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        Generando vista previa...
      </div>
    );
  }

  if (error || !preview?.signedUrl) {
    return (
      <div className={cn("flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03]", className)}>
        <FileText className="mb-3 h-8 w-8" aria-hidden="true" />
        {error ?? "No hay vista previa disponible."}
      </div>
    );
  }

  const isPdf = preview.contentType?.includes("pdf") || preview.filename?.toLowerCase().endsWith(".pdf");

  return (
    <section className={cn("overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{preview.filename}</p>
        </div>
        <a
          href={preview.signedUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
        >
          Abrir
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </header>
      {isPdf ? (
        <iframe title={title} src={preview.signedUrl} className="h-[70vh] w-full bg-slate-100" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.signedUrl} alt={preview.filename} className="max-h-[70vh] w-full object-contain bg-slate-100" />
      )}
    </section>
  );
}
