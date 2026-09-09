export function buildClaveDocumental(
    cliente: string,
    tipo: string | null,
    metadata: Record<string, any>,
  ): string | null {
    const clienteKey = String(cliente || 'BBTI').trim().toUpperCase();
    const tipoKey = String(tipo || '').trim().toUpperCase();

    const clean = (v: any) => {
      if (v === null || v === undefined) return null;
      const text = String(v).trim();
      return text.length ? text : null;
    };

    const ruc = clean(metadata.ruc ?? metadata.rucProveedor ?? metadata.rucEmisor);
    const serie = clean(metadata.serie);
    const numero = clean(metadata.numero);
    const numeroOperacion = clean(metadata.numeroOperacion);

    if (['FACTURA', 'GUIA_REMISION', 'NOTA_CREDITO', 'RECIBO_HONORARIO'].includes(tipoKey)) {
      if (clienteKey && ruc && serie && numero) {
        return `${clienteKey}|${tipoKey}|${ruc}|${serie}|${numero}`;
      }
    }

    if (['OC', 'OS', 'NOTA_INGRESO'].includes(tipoKey)) {
      if (clienteKey && numero) {
        return `${clienteKey}|${tipoKey}|${numero}`;
      }
    }

    if (['TRANSFERENCIA', 'PAGO_TRANSFERENCIA', 'PAGO_DETRACCION'].includes(tipoKey)) {
      if (clienteKey && numeroOperacion) {
        return `${clienteKey}|${tipoKey}|${numeroOperacion}`;
      }
    }

    return null;
  }


export function identidadFacturaPendiente(empresa: string, ocr: any): string | null {
  if (!ocr || !["pendiente_validacion", "editado"].includes(ocr.estado)) return null;
  const metadata = ocr.metadata?.metadata ?? {};
  const tipo = String(metadata.tipoDocumental ?? ocr.tipo_propuesto ?? "").trim().toUpperCase();
  const ruc = String(metadata.ruc ?? metadata.rucProveedor ?? metadata.rucEmisor ?? "").trim();
  if (tipo !== "FACTURA" || !/^\d{11}$/.test(ruc)) return null;
  return buildClaveDocumental(empresa, tipo, metadata);
}
