import { BadRequestException } from '@nestjs/common';

export type PeriodoDocumentalR2 = {
  anio: string;
  mes: string;
  fecha: Date;
};

export function resolverFechaDocumentalR2(
  valor: unknown,
): PeriodoDocumentalR2 {
  if (typeof valor !== 'string') {
    throw new BadRequestException('FECHA_DOCUMENTAL_R2_INVALIDA');
  }

  const fechaTexto = valor.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) {
    throw new BadRequestException('FECHA_DOCUMENTAL_R2_INVALIDA');
  }

  const [anio, mes, dia] = fechaTexto.split('-').map(Number);

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() + 1 !== mes ||
    fecha.getUTCDate() !== dia
  ) {
    throw new BadRequestException('FECHA_DOCUMENTAL_R2_INVALIDA');
  }

  return {
    anio: String(anio),
    mes: String(mes).padStart(2, '0'),
    fecha,
  };
}
