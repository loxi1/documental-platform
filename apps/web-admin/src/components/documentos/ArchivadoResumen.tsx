"use client";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
type Estado = { nas_estado: string; r2_estado: string; trabajo_estado: string; cantidad: number };
type Resumen = { expedienteId: number; estados: Estado[]; bloqueosNomenclatura?: { motivo: string; cantidad: number }[] };
function unwrap(value: unknown): Resumen | null {
  let v = value as Record<string, unknown> | null;
  for (let i=0;i<5 && v;i++) {
    if (Array.isArray(v.estados)) return v as unknown as Resumen;
    v = v.data && typeof v.data === "object" ? v.data as Record<string,unknown> : null;
  }
  return null;
}
export function ArchivadoResumen({ expedienteId, readOnly, archiveProcessingEnabled = false }: { expedienteId: number; readOnly: boolean; archiveProcessingEnabled?: boolean }) {
  const [resumen,setResumen]=useState<Resumen|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{
    let active=true;setResumen(null);setError("");
    if(Number.isSafeInteger(expedienteId)&&expedienteId>0) {
      api.get(`/documentos/archivado/expedientes/${expedienteId}`).then(r=>{if(active)setResumen(unwrap(r.data));}).catch(()=>{});
    }
    return()=>{active=false;};
  },[expedienteId]);
  if(!resumen)return null;
  const total=resumen.estados.reduce((n,e)=>n+Number(e.cantidad),0);
  const nas=resumen.estados.filter(e=>e.nas_estado==="VERIFICADO").reduce((n,e)=>n+Number(e.cantidad),0);
  async function regularizar(){
    if(busy||readOnly||!archiveProcessingEnabled)return;setBusy(true);setError("");
    try{const r=await api.post(`/documentos/archivado/expedientes/${expedienteId}/regularizar`);setResumen(unwrap(r.data));}
    catch{setError("No se pudo completar la regularización. Los documentos conservan su estado registrado.");}
    finally{setBusy(false);}
  }
  return <div className="flex flex-col items-center gap-2 text-sm" aria-live="polite">
    <p>Archivado: {nas} de {total} archivos verificados en NAS.</p>
    {Boolean(resumen.bloqueosNomenclatura?.length)&&<p>Hay archivos pendientes de una regla de nomenclatura aprobada.</p>}
    {!readOnly&&archiveProcessingEnabled&&<Button type="button" variant="outline" disabled={busy} onClick={regularizar}>{busy?"Regularizando…":"Regularizar ahora"}</Button>}
    {error&&<p role="alert" className="text-destructive">{error}</p>}
  </div>;
}
