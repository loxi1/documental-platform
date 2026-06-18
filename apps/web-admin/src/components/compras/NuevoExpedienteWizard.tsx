"use client";

import Link from "next/link";
import { ArrowLeft, FileText, ReceiptText, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const OPTIONS = [
  {
    title: "Orden de Compra",
    description: "Registrar una OC y asociarla a una OP / PR con código 05*.",
    icon: ShoppingCart,
  },
  {
    title: "Orden de Servicio",
    description: "Registrar una OS y asociarla a un centro de costo con código 03*.",
    icon: FileText,
  },
  {
    title: "Factura directa",
    description: "Registrar una factura sin OC/OS como gasto directo.",
    icon: ReceiptText,
  },
];

export function NuevoExpedienteWizard() {
  return (
    <main className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 px-0">
          <Link href="/compras">
            <ArrowLeft className="h-4 w-4" />
            Volver a compras
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Nuevo expediente de compras</h1>
        <p className="text-sm text-muted-foreground">
          Selecciona cómo iniciará el expediente. La creación real se habilitará cuando el endpoint esté listo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <Card key={option.title} className="transition hover:border-primary/50">
              <CardHeader>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle>{option.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{option.description}</p>
                <Button className="mt-4 w-full" disabled>
                  Iniciar
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
