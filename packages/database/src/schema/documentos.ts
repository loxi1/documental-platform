import { pgSchema, integer, varchar, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const documentosSchema = pgSchema('documentos');

export const documentos = documentosSchema.table('documentos', {
  id: integer('id').primaryKey(),
  clienteAbreviatura: varchar('cliente_abreviatura', { length: 30 }).notNull(),
  anio: integer('anio'),
  mes: integer('mes'),
  tipoDocumental: varchar('tipo_documental', { length: 50 }).notNull(),
  rucEmisor: varchar('ruc_emisor', { length: 20 }),
  razonSocialEmisor: text('razon_social_emisor'),
  serie: varchar('serie', { length: 30 }),
  numero: varchar('numero', { length: 50 }),
  claveDocumental: varchar('clave_documental', { length: 300 }),
  estado: varchar('estado', { length: 50 }),
  metadata: jsonb('metadata'),
  creadoEn: timestamp('creado_en'),
});

export const documentosArchivos = documentosSchema.table('documentos_archivos', {
  id: integer('id').primaryKey(),
  documentoId: integer('documento_id').notNull(),
  nombreArchivo: text('nombre_archivo').notNull(),
  rutaArchivo: text('ruta_archivo').notNull(),
  hashSha256: varchar('hash_sha256', { length: 64 }),
  tipoVersion: varchar('tipo_version', { length: 50 }),
  areaOrigen: varchar('area_origen', { length: 50 }),
  estado: varchar('estado', { length: 50 }),
  origenArchivo: varchar('origen_archivo', { length: 50 }),
  observacion: text('observacion'),
  storageProvider: varchar('storage_provider', { length: 30 }),
  storageBucket: text('storage_bucket'),
  storageKey: text('storage_key'),
  publicUrl: text('public_url'),
  metadata: jsonb('metadata'),
  creadoEn: timestamp('creado_en'),
});
