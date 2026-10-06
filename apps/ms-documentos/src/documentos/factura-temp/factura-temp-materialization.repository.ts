import { ConflictException, Injectable } from '@nestjs/common';
import { buildClaveDocumental } from '../identidad-documental';
import type {
  TmpConnection,
  TmpRow,
} from '../tmp/tmp.repository';

export const OP_FACTURA_REGULARIZER_MATERIALIZATION =
  'OP_FACTURA_REGULARIZER_MATERIALIZATION';

export type FacturaTempActor = {
  actorId: number;
  workspaceId: number;
  empresaCodigo: string;
  clienteDestinoId: number;
};

export type FacturaTempIds = {
  documentoId: number;
  archivoId?: number | null;
};

@Injectable()
export class FacturaTempMaterializationRepository {
  assertClaim(
    row: TmpRow,
    identity: string,
    documentoId?: number,
  ) {
    const claim = row.metadata?.integration;

    if (
      !claim ||
      claim.consumer !== OP_FACTURA_REGULARIZER_MATERIALIZATION ||
      claim.identity !== identity ||
      (documentoId != null &&
        Number(row.documento_id) !== Number(documentoId))
    ) {
      throw new ConflictException(
        'FACTURA_TEMP_ALREADY_RESERVED',
      );
    }
  }

  async reserve(
    tx: TmpConnection,
    row: TmpRow,
    identity: string,
    destination: string,
    actor: FacturaTempActor,
  ): Promise<{ documentoId: number }> {
    if (row.metadata?.integration) {
      this.assertClaim(
        row,
        identity,
        Number(row.documento_id),
      );

      return {
        documentoId: Number(row.documento_id),
      };
    }

    if (
      row.estado !== 'almacenada' ||
      row.promovida_en ||
      row.documento_id ||
      row.archivo_id ||
      row.metadata?.destinoReservado
    ) {
      throw new ConflictException(
        'FACTURA_TEMP_NOT_AVAILABLE',
      );
    }

    // OCR es asistencia, no autoridad ni requisito de materialización.
    // La validación humana posterior exige los campos fiscales mínimos.

    if (
      Number(row.actor_id) !== actor.actorId ||
      Number(row.workspace_id) !== actor.workspaceId ||
      row.empresa_codigo !== actor.empresaCodigo ||
      Number(row.cliente_destino_id) !==
        actor.clienteDestinoId
    ) {
      throw new ConflictException(
        'FACTURA_TEMP_SCOPE_CONFLICT',
      );
    }

    const [documento] = await tx`
      INSERT INTO documentos.documentos (
        workspace_id,
        empresa_codigo,
        cliente_destino_id,
        tipo_documental,
        estado,
        metadata,
        creado_por
      )
      VALUES (
        ${actor.workspaceId},
        ${actor.empresaCodigo},
        ${actor.clienteDestinoId},
        'FACTURA',
        'pendiente_ocr',
        ${JSON.stringify({
          origen: 'TEMP_REGULARIZACION_OP',
          tempId: Number(row.id),
        })}::jsonb,
        ${actor.actorId}
      )
      RETURNING id
    `;

    if (!documento?.id) {
      throw new ConflictException(
        'FACTURA_TEMP_DOCUMENT_NOT_CREATED',
      );
    }

    const documentoId = Number(documento.id);

    const metadata = {
      ...row.metadata,
      destinoReservado: destination,
      promocionIdentity: identity,
      integration: {
        consumer:
          OP_FACTURA_REGULARIZER_MATERIALIZATION,
        identity,
        completed: false,
      },
    };

    await tx`
      UPDATE documentos.carga_operaciones
      SET documento_id=${documentoId},
          metadata=${JSON.stringify(metadata)}::jsonb,
          actualizado_en=now()
      WHERE id=${row.id}
    `;

    return { documentoId };
  }

  async confirmFacturaWithExecutor(
    tx: TmpConnection,
    params: {
      documentoId: number;
      archivoId: number;
      actor: FacturaTempActor;
      metadata: Record<string, any>;
      ocrCandidate?: any;
    },
  ) {
    const {
      documentoId,
      archivoId,
      actor,
      metadata: metadataInput,
      ocrCandidate,
    } = params;

    const [documento] = await tx`
      SELECT
        id,
        tipo_documental,
        estado,
        workspace_id,
        empresa_codigo,
        cliente_destino_id,
        metadata
      FROM documentos.documentos
      WHERE id=${documentoId}
        AND workspace_id=${actor.workspaceId}
        AND empresa_codigo=${actor.empresaCodigo}
        AND cliente_destino_id=${actor.clienteDestinoId}
      FOR UPDATE
    `;

    if (
      !documento ||
      documento.tipo_documental !== 'FACTURA' ||
      ['anulado', 'duplicado_versionado'].includes(String(documento.estado))
    ) {
      throw new ConflictException('FACTURA_TEMP_DOCUMENT_CONFLICT');
    }

    const [archivo] = await tx`
      SELECT
        id,
        documento_id,
        estado
      FROM documentos.documentos_archivos
      WHERE id=${archivoId}
        AND documento_id=${documentoId}
        AND workspace_id=${actor.workspaceId}
        AND empresa_codigo=${actor.empresaCodigo}
        AND cliente_destino_id=${actor.clienteDestinoId}
      FOR UPDATE
    `;

    if (
      !archivo ||
      ['anulado', 'duplicado_absorbido'].includes(String(archivo.estado))
    ) {
      throw new ConflictException('FACTURA_TEMP_FILE_CONFLICT');
    }

    const metadata: Record<string, any> = {
      ...(metadataInput ?? {}),
      tipoDocumental: 'FACTURA',
      clienteAbreviatura: actor.empresaCodigo,
    };

    const clean = (value: any) => {
      if (value === null || value === undefined) return null;
      const text = String(value).trim();
      return text.length ? text : null;
    };

    const rucEmisor = clean(
      metadata.rucProveedor ?? metadata.rucEmisor ?? metadata.ruc,
    );
    const serie = clean(metadata.serie);
    const numero = clean(metadata.numero);
    const fechaEmision = clean(metadata.fechaEmision);
    const moneda = clean(metadata.moneda);
    const montoTotal = clean(metadata.montoTotal);

    let proveedor = clean(
      metadata.proveedor ??
        metadata.razonSocial ??
        metadata.razonSocialEmisor,
    );

    if (!proveedor && rucEmisor && /^\d{11}$/.test(rucEmisor)) {
      const [catalogo] = await tx`
        SELECT
          razon_social,
          direccion,
          tipo_persona
        FROM core.proveedores
        WHERE ruc=${rucEmisor}
        LIMIT 1
      `;

      if (catalogo?.razon_social) {
        proveedor = String(catalogo.razon_social).trim();
        metadata.proveedor = proveedor;
        metadata.razonSocial = proveedor;
        metadata.razonSocialEmisor = proveedor;
        metadata.proveedorOrigen = 'CATALOGO_PROVEEDORES';

        if (catalogo.direccion) {
          metadata.direccionProveedor = catalogo.direccion;
        }

        if (catalogo.tipo_persona) {
          metadata.tipoPersonaProveedor = catalogo.tipo_persona;
        }
      }
    }

    const faltantes: string[] = [];

    if (!fechaEmision) faltantes.push('fechaEmision');
    if (!serie) faltantes.push('serie');
    if (!numero) faltantes.push('numero');
    if (!rucEmisor) faltantes.push('rucProveedor');
    if (!proveedor) faltantes.push('proveedor');
    if (!montoTotal) faltantes.push('montoTotal');

    if (faltantes.length) {
      throw new ConflictException(
        `FACTURA_TEMP_METADATA_INVALID:${faltantes.join(',')}`,
      );
    }

    metadata.rucProveedor = rucEmisor;
    metadata.rucEmisor = rucEmisor;
    metadata.ruc = rucEmisor;
    metadata.proveedor = proveedor;
    metadata.razonSocial = proveedor;
    metadata.razonSocialEmisor = proveedor;
    metadata.serie = serie;
    metadata.numero = numero;
    metadata.fechaEmision = fechaEmision;
    metadata.montoTotal = montoTotal;

    const claveDocumental = buildClaveDocumental(
      actor.empresaCodigo,
      'FACTURA',
      metadata,
    );

    if (!claveDocumental) {
      throw new ConflictException('FACTURA_TEMP_CLAVE_INVALID');
    }

    metadata.claveDocumental = claveDocumental;

    const duplicados = await tx`
      SELECT d.id
      FROM documentos.documentos d
      WHERE d.workspace_id=${actor.workspaceId}
        AND d.empresa_codigo=${actor.empresaCodigo}
        AND d.cliente_destino_id=${actor.clienteDestinoId}
        AND d.id <> ${documentoId}
        AND COALESCE(d.estado, '') NOT IN ('anulado', 'duplicado_versionado')
        AND (
          d.clave_documental=${claveDocumental}
          OR EXISTS (
            SELECT 1
            FROM documentos.ocr_resultados ocr_existente
            WHERE ocr_existente.documento_id=d.id
              AND ocr_existente.clave_documental=${claveDocumental}
              AND ocr_existente.estado IN (
                'pendiente_validacion',
                'confirmado',
                'editado',
                'confirmado_como_version'
              )
          )
        )
      ORDER BY
        CASE WHEN d.clave_documental=${claveDocumental} THEN 0 ELSE 1 END,
        d.id ASC
      LIMIT 1
    `;

    if (duplicados[0]) {
      throw new ConflictException('FACTURA_TEMP_DOCUMENT_DUPLICATE');
    }

    let ocrResultadoId: number | null = null;

    if (ocrCandidate) {
      const existingOcr = await tx`
        SELECT id
        FROM documentos.ocr_resultados
        WHERE documento_id=${documentoId}
          AND archivo_id=${archivoId}
          AND estado IN ('pendiente_validacion', 'confirmado', 'editado')
        ORDER BY id ASC
        LIMIT 1
        FOR UPDATE
      `;

      if (existingOcr[0]?.id) {
        ocrResultadoId = Number(existingOcr[0].id);
      } else {
        const [ocr] = await tx`
          INSERT INTO documentos.ocr_resultados (
            archivo_id,
            documento_id,
            tipo_propuesto,
            estado,
            confidence,
            clave_documental,
            metadata
          )
          VALUES (
            ${archivoId},
            ${documentoId},
            'FACTURA',
            'pendiente_validacion',
            ${ocrCandidate.confidence ?? null},
            ${claveDocumental},
            ${JSON.stringify({
              ...(ocrCandidate.resultado ?? ocrCandidate.metadata ?? {}),
              temporal: true,
              origen: 'TEMP_REGULARIZACION_OP',
            })}::jsonb
          )
          RETURNING id
        `;

        ocrResultadoId = Number(ocr.id);
      }
    }

    const metadataDocumento = {
      ...(documento.metadata ?? {}),
      tipoDocumental: 'FACTURA',
      claveDocumental,
      validacionManual: {
        estado: 'confirmado',
        tipoDocumental: 'FACTURA',
        claveDocumental,
        metadata,
        ocrResultadoId,
        validadoPor: actor.actorId,
      },
    };

    const [updated] = await tx`
      UPDATE documentos.documentos
      SET
        tipo_documental='FACTURA',
        razon_social_emisor=${proveedor},
        serie=${serie},
        numero=${numero},
        clave_documental=${claveDocumental},
        estado='confirmado',
        ruc_emisor=${rucEmisor},
        fecha_emision=${fechaEmision}::date,
        moneda=${moneda},
        monto_total=${montoTotal}::numeric,
        metadata=${JSON.stringify(metadataDocumento)}::jsonb,
        actualizado_en=now()
      WHERE id=${documentoId}
      RETURNING *
    `;

    await tx`
      INSERT INTO documentos.documentos_factura (
        documento_id,
        ruc_emisor,
        serie,
        numero,
        fecha_emision,
        total
      )
      VALUES (
        ${documentoId},
        ${rucEmisor},
        ${serie},
        ${numero},
        ${fechaEmision}::date,
        ${montoTotal}::numeric
      )
      ON CONFLICT (documento_id)
      DO UPDATE SET
        ruc_emisor=EXCLUDED.ruc_emisor,
        serie=EXCLUDED.serie,
        numero=EXCLUDED.numero,
        fecha_emision=EXCLUDED.fecha_emision,
        total=EXCLUDED.total
    `;

    if (ocrResultadoId != null) {
      await tx`
        UPDATE documentos.ocr_resultados
        SET
          tipo_propuesto='FACTURA',
          estado='confirmado',
          clave_documental=${claveDocumental},
          metadata=COALESCE(metadata, '{}'::jsonb)
            || jsonb_build_object(
              'estado', 'confirmado'::text,
              'tipoDocumental', 'FACTURA'::text,
              'tipoPropuesto', 'FACTURA'::text,
              'claveDocumental', ${claveDocumental}::text,
              'metadata', ${JSON.stringify(metadata)}::jsonb
            ),
          validado_por=${actor.actorId},
          validado_en=now()
        WHERE id=${ocrResultadoId}
      `;
    }

    return {
      documento: updated,
      documentoId,
      archivoId,
      ocrResultadoId,
      claveDocumental,
      metadata,
    };
  }

  async createOrReuseDocumentAndFileWithExecutor(
    tx: TmpConnection,
    row: TmpRow,
    documentoId: number,
    identity: string,
    destination: string,
    actor: FacturaTempActor,
  ): Promise<FacturaTempIds> {
    this.assertClaim(row, identity, documentoId);

    if (
      row.metadata?.destinoReservado !== destination ||
      row.metadata?.promocionIdentity !== identity ||
      Number(row.actor_id) !== actor.actorId ||
      Number(row.workspace_id) !== actor.workspaceId ||
      row.empresa_codigo !== actor.empresaCodigo ||
      Number(row.cliente_destino_id) !==
        actor.clienteDestinoId
    ) {
      throw new ConflictException(
        'FACTURA_TEMP_CLAIM_CONFLICT',
      );
    }

    const [documento] = await tx`
      SELECT
        id,
        tipo_documental,
        estado,
        workspace_id,
        empresa_codigo,
        cliente_destino_id
      FROM documentos.documentos
      WHERE id=${documentoId}
        AND workspace_id=${actor.workspaceId}
        AND empresa_codigo=${actor.empresaCodigo}
        AND cliente_destino_id=${actor.clienteDestinoId}
      FOR UPDATE
    `;

    if (
      !documento ||
      documento.tipo_documental !== 'FACTURA' ||
      ['anulado', 'duplicado_versionado'].includes(
        String(documento.estado),
      )
    ) {
      throw new ConflictException(
        'FACTURA_TEMP_DOCUMENT_CONFLICT',
      );
    }

    const [existing] = await tx`
      SELECT *
      FROM documentos.documentos_archivos
      WHERE carga_operacion_id=${row.id}
      FOR UPDATE
    `;

    let archivoId: number;

    if (existing) {
      if (
        Number(existing.documento_id) !== documentoId ||
        existing.storage_key !== destination ||
        existing.hash_sha256 !== row.hash_sha256 ||
        existing.storage_bucket !== row.storage_bucket ||
        Number(existing.metadata?.tamanoBytes) !==
          Number(row.tamano_bytes)
      ) {
        throw new ConflictException(
          'FACTURA_TEMP_FILE_CONFLICT',
        );
      }

      archivoId = Number(existing.id);
    } else {
      const metadata = {
        rol: 'REGULARIZADOR_FACTURA',
        tipoDocumental: 'FACTURA',
        tempId: Number(row.id),
        contentType: row.content_type,
        tamanoBytes: Number(row.tamano_bytes),
      };

      const [file] = await tx`
        INSERT INTO documentos.documentos_archivos (
          documento_id,
          carga_operacion_id,
          nombre_archivo,
          ruta_archivo,
          storage_provider,
          storage_bucket,
          storage_key,
          hash_sha256,
          metadata,
          creado_por,
          workspace_id,
          empresa_codigo,
          cliente_destino_id,
          expediente_id,
          tipo_version,
          version,
          es_version_actual,
          estado,
          area_origen,
          origen_archivo
        )
        VALUES (
          ${documentoId},
          ${row.id},
          ${row.nombre_archivo_original},
          ${destination},
          'r2',
          ${row.storage_bucket},
          ${destination},
          ${row.hash_sha256},
          ${JSON.stringify(metadata)}::jsonb,
          ${actor.actorId},
          ${actor.workspaceId},
          ${actor.empresaCodigo},
          ${actor.clienteDestinoId},
          NULL,
          'original',
          1,
          true,
          'subido',
          'FINANZAS',
          'REGULARIZADOR_FACTURA'
        )
        RETURNING id
      `;

      if (!file?.id) {
        throw new ConflictException(
          'FACTURA_TEMP_FILE_NOT_CREATED',
        );
      }

      archivoId = Number(file.id);
    }

    await tx`
      UPDATE documentos.carga_operaciones
      SET archivo_id=${archivoId},
          actualizado_en=now()
      WHERE id=${row.id}
    `;

    return {
      documentoId,
      archivoId,
    };
  }
}
