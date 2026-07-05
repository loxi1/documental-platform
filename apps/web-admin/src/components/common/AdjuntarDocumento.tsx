"use client";

import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

type AdjuntarDocumentoProps = {
  label?: string;
  description?: string;
  disabled?: boolean;
  accept?: string;
  className?: string;
  onSelect?: (files: FileList) => void;
};

export function AdjuntarDocumento({
  label = "Adjuntar documento",
  description = "Arrastra un PDF o imagen, o selecciónalo desde tu equipo.",
  disabled = false,
  accept = "application/pdf,image/*",
  className,
  onSelect,
}: AdjuntarDocumentoProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200">
        <UploadCloud className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">{label}</span>
      <span className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{description}</span>
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          if (event.target.files?.length) onSelect?.(event.target.files);
        }}
      />
    </label>
  );
}
