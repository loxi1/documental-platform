"use client";

import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import {
  CARGA_SEGURA_ACCEPTED_MIME_TYPES,
  CARGA_SEGURA_MAX_FILE_SIZE_BYTES,
} from "@/types/documental-v2-carga-segura";

export function CargaDocumentalDropzone({
  disabled,
  onFileAccepted,
  onRejected,
}: {
  disabled?: boolean;
  onFileAccepted: (file: File) => void;
  onRejected: (reason: "payload_too_large" | "unsupported_media") => void;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    disabled,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    onDrop: (acceptedFiles, rejectedFiles) => {
      const file = acceptedFiles[0];

      if (file) {
        if (file.size > CARGA_SEGURA_MAX_FILE_SIZE_BYTES) {
          onRejected("payload_too_large");
          return;
        }

        if (!CARGA_SEGURA_ACCEPTED_MIME_TYPES.includes(file.type as never)) {
          onRejected("unsupported_media");
          return;
        }

        onFileAccepted(file);
        return;
      }

      const rejected = rejectedFiles[0]?.file;

      if (rejected?.size && rejected.size > CARGA_SEGURA_MAX_FILE_SIZE_BYTES) {
        onRejected("payload_too_large");
        return;
      }

      onRejected("unsupported_media");
    },
  });

  return (
    <div
      {...getRootProps()}
      className="cursor-pointer rounded-xl border border-dashed p-6 text-center transition hover:bg-muted/40"
      aria-disabled={disabled}
    >
      <input {...getInputProps()} />
      <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium">
        {isDragActive ? "Suelta el archivo aquí" : "Arrastra o selecciona un archivo"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        PDF, JPG o PNG. Máximo 15 MiB. Un solo archivo.
      </p>
    </div>
  );
}
