import { pgSchema, integer, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const core = pgSchema('core');

export const clientesDestino = core.table('clientes_destino', {
  id: integer('id').primaryKey(),
  nombreOficial: varchar('nombre_oficial', { length: 250 }),
  abreviatura: varchar('abreviatura', { length: 50 }),
  ruc: varchar('ruc', { length: 20 }),
  rutaWindows: text('ruta_windows'),
  descripcion: text('descripcion'),
  estado: boolean('estado'),
  creadoEn: timestamp('creado_en'),
  actualizadoEn: timestamp('actualizado_en'),
});

export const proveedores = core.table('proveedores', {
  id: integer('id').primaryKey(),
  ruc: varchar('ruc', { length: 11 }).unique(),
  razonSocial: varchar('razon_social', { length: 250 }),
  direccion: text('direccion'),
  tipoPersona: varchar('tipo_persona', { length: 20 }),
  creadoEn: timestamp('creado_en'),
  actualizadoEn: timestamp('actualizado_en'),
});
