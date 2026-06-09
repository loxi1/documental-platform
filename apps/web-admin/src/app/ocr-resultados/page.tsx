"use client";

import { useOcrResultados } from "@/hooks/useOcrResultados";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function OcrResultadosPage() {
  const { data, isLoading, error } = useOcrResultados();

  if (isLoading) {
    return <div className="p-6">Cargando OCR resultados...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Error cargando OCR resultados
      </div>
    );
  }

  return (
    <main className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">OCR Resultados</h1>
        <p className="text-sm text-muted-foreground">
          Propuestas OCR generadas por el worker.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">ID</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Confianza</th>
                  <th>Clave documental</th>
                  <th>Archivo</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {data?.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.id}</td>
                    <td>{item.tipo_propuesto}</td>
                    <td>
                      <Badge variant="secondary">
                        {item.estado}
                      </Badge>
                    </td>
                    <td>{item.confidence}</td>
                    <td className="font-mono text-xs">
                      {item.clave_documental}
                    </td>
                    <td>{item.nombre_archivo}</td>
                    <td className="space-x-2">
                      <Button size="sm" variant="outline">
                        Ver
                      </Button>

                      <Button size="sm">
                        Sugerir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!data?.length && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No hay resultados OCR.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}