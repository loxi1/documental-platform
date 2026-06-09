"use client";

import { useOcrResultados } from "@/hooks/useOcrResultados";

export default function OcrResultadosPage() {
  const { data, isLoading } = useOcrResultados();

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        OCR Resultados
      </h1>

      <pre>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}