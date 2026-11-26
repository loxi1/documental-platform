export function resolverNomenclaturaImportacion(
  input: {
    empresaCodigo: string;
    solicitudId: string;
    fecha: Date;
  },
) {
  const { empresaCodigo, solicitudId, fecha } = input;

  if (!/^[A-Z0-9_-]{1,20}$/.test(empresaCodigo)) {
    throw new TypeError(
      'IMPORTACION_EMPRESA_NOMENCLATURA_INVALIDA',
    );
  }

  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
      .test(solicitudId)
  ) {
    throw new TypeError(
      'IMPORTACION_SOLICITUD_ID_INVALIDA',
    );
  }

  if (
    !(fecha instanceof Date) ||
    !Number.isFinite(fecha.getTime()) ||
    fecha.getUTCFullYear() < 1 ||
    fecha.getUTCFullYear() > 9999
  ) {
    throw new TypeError(
      'IMPORTACION_FECHA_INVALIDA',
    );
  }

  const periodoFecha = fecha.toISOString().slice(0, 10);

  const [anio, mes, dia] = periodoFecha.split('-');

  const hora = fecha.toISOString()
    .slice(11, 23)
    .replace(/[:.]/g, '');

  const nombre =
    `CENTROS_COSTO_${anio}${mes}${dia}_${hora}.csv`;

  const storageKey = [
    'documentos',
    anio,
    mes,
    empresaCodigo,
    'CENTROS_COSTO',
    nombre,
  ].join('/');

  return {
    periodoFecha,
    nombre,
    storageKey,
  };
}
