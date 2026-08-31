-- ============================================================================
-- Gestion Documental - seed mínimo
--
-- No contiene contraseñas ni datos históricos. Antes de ejecutarlo con psql,
-- suministre un hash bcrypt nuevo mediante:
--   psql ... -v admin_password_hash='\$2b\$12\$HASH_BCRYPT_REAL' -f este_archivo.sql
--
-- La variable es obligatoria. No use hashes compartidos entre ambientes.
-- ============================================================================

\if :{?admin_password_hash}
\else
  \echo 'ERROR: falta -v admin_password_hash=HASH_BCRYPT_REAL'
  \quit 3
\endif

INSERT INTO core.sistemas (
  codigo, nombre, descripcion, estado, orden
)
VALUES (
  'DOCUMENTAL', 'Gestión Documental', 'Sistema documental principal', 'activo', 1
)
ON CONFLICT (codigo) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    estado = EXCLUDED.estado,
    orden = EXCLUDED.orden;

UPDATE core.clientes_destino
SET nombre_oficial = datos.nombre_oficial,
    ruc = datos.ruc,
    descripcion = 'Empresa destino',
    estado = true,
    dia_cierre_contable = 11,
    dias_gracia_regularizacion = 0,
    actualizado_en = now()
FROM (VALUES
  ('BBTEC', 'BB TECNOLOGIA INDUSTRIAL S.A.C.', '20299922821'),
  ('BBTI', 'BBTI S.A.C.', '20565747356')
) AS datos(abreviatura, nombre_oficial, ruc)
WHERE core.clientes_destino.abreviatura = datos.abreviatura;

INSERT INTO core.clientes_destino (
  nombre_oficial, abreviatura, ruc, ruta_windows, descripcion, estado,
  dia_cierre_contable, dias_gracia_regularizacion
)
SELECT
  datos.nombre_oficial, datos.abreviatura, datos.ruc, NULL,
  'Empresa destino', true, 11, 0
FROM (VALUES
  ('BBTEC', 'BB TECNOLOGIA INDUSTRIAL S.A.C.', '20299922821'),
  ('BBTI', 'BBTI S.A.C.', '20565747356')
) AS datos(abreviatura, nombre_oficial, ruc)
WHERE NOT EXISTS (
  SELECT 1
  FROM core.clientes_destino existente
  WHERE existente.abreviatura = datos.abreviatura
);

INSERT INTO core.monedas (codigo, nombre, simbolo, activo, orden)
VALUES
  ('PEN', 'SOLES', 'S/', true, 1),
  ('USD', 'DOLARES AMERICANOS', 'US$', true, 2)
ON CONFLICT (codigo) DO UPDATE
SET nombre = EXCLUDED.nombre,
    simbolo = EXCLUDED.simbolo,
    activo = EXCLUDED.activo,
    orden = EXCLUDED.orden;

INSERT INTO auth.perfiles (sistema_id, codigo, nombre, descripcion, estado)
SELECT id, 'admin', 'Administrador', 'Administrador del sistema documental', 'activo'
FROM core.sistemas
WHERE codigo = 'DOCUMENTAL'
ON CONFLICT (sistema_id, codigo) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    estado = EXCLUDED.estado;

INSERT INTO auth.usuarios (
  nombres, apellidos, email, password_hash, estado
)
VALUES (
  'Administrador', 'Inicial', 'admin@documental.local', :'admin_password_hash', 'activo'
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    estado = EXCLUDED.estado,
    actualizado_en = now();

INSERT INTO auth.usuario_workspaces (
  usuario_id, empresa_codigo, cliente_destino_id, sistema_id, perfil_id,
  estado, es_favorito, permission_version, permisos
)
SELECT
  u.id,
  cd.abreviatura,
  cd.id,
  s.id,
  p.id,
  'activo',
  cd.abreviatura = 'BBTI',
  1,
  '{"menus":["documentos"],"actions":["documentos.ver","documentos.subir","documentos.validar","documentos.editar_ocr","documentos.confirmar_ocr","documentos.rechazar_ocr","documentos.vincular_expediente"]}'::jsonb
FROM auth.usuarios u
CROSS JOIN core.sistemas s
JOIN auth.perfiles p ON p.sistema_id = s.id AND p.codigo = 'admin'
CROSS JOIN core.clientes_destino cd
WHERE u.email = 'admin@documental.local'
  AND s.codigo = 'DOCUMENTAL'
  AND cd.abreviatura IN ('BBTI', 'BBTEC')
ON CONFLICT (usuario_id, empresa_codigo, sistema_id, perfil_id) DO UPDATE
SET cliente_destino_id = EXCLUDED.cliente_destino_id,
    estado = EXCLUDED.estado,
    es_favorito = EXCLUDED.es_favorito,
    permission_version = EXCLUDED.permission_version,
    permisos = EXCLUDED.permisos,
    actualizado_en = now();
