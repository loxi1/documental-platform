import { ConflictException, Injectable } from '@nestjs/common';
import { buildClaveDocumental } from '../identidad-documental';
import type {
  TmpConnection,
  TmpRow,
} from '../tmp/tmp.repository';

export const OP_RECIBO_HONORARIO_REGULARIZER_MATERIALIZATION =
  'OP_RECIBO_HONORARIO_REGULARIZER_MATERIALIZATION';

export type ReciboHonorarioTempActor = {
  actorId: number;
  workspaceId: number;
  empresaCodigo: string;
  clienteDestinoId: number;
};

export type ReciboHonorarioTempIds = {
  documentoId: number;
  archivoId?: number | null;
};

@Injectable()
export class ReciboHonorarioTempMaterializationRepository {
  assertClaim(
    row: TmpRow,
    identity: string,
    documentoId?: number,
  ) {
    const claim = row.metadata?.integration;

    if (
      !claim ||
      claim.consumer !==
        OP_RECIBO_HONORARIO_REGULARIZER_MATERIALIZATION ||
      claim.identity !== identity ||
      (documentoId != null &&
        Number(row.documento_id) !== Number(documentoId))
    ) {
      throw new ConflictException(
        'RECIBO_HONORARIO_TEMP_ALREADY_RESERVED',
      );
    }
  }

  async reserve(
    tx: TmpConnection,
    row: TmpRow,
    identity: string,
    destination: string,
    actor: ReciboHonorarioTempActor,
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
        'RECIBO_HONORARIO_TEMP_NOT_AVAILABLE',
      );
    }

    const ocrCandidate = row.metadata?.ocrCandidate;

    if (!ocrCandidate) {
      throw new ConflictException(
        'RECIBO_HONORARIO_TEMP_OCR_NOT_ATTEMPTED',
      );
    }

    if (
      ocrCandidate.tipoEsperado !==
      'RECIBO_HONORARIO'
    ) {
      throw new ConflictException(
        'RECIBO_HONORARIO_TEMP_OCR_TYPE_CONFLICT',
      );
    }

    if (ocrCandidate.status === 'PROCESSING') {
      throw new ConflictException(
        'RECIBO_HONORARIO_TEMP_OCR_PROCESSING',
      );
    }

    if (ocrCandidate.status !== 'DONE') {
      throw new ConflictException(
        'RECIBO_HONORARIO_TEMP_OCR_STATE_INVALID',
      );
    }

    if (
      Number(row.actor_id) !== actor.actorId ||
      Number(row.workspace_id) !== actor.workspaceId ||
      row.empresa_codigo !== actor.empresaCodigo ||
      Number(row.cliente_destino_id) !==
        actor.clienteDestinoId
    ) {
      throw new ConflictException(
        'RECIBO_HONORARIO_TEMP_SCOPE_CONFLICT',
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
        'RECIBO_HONORARIO',
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
        'RECIBO_HONORARIO_TEMP_DOCUMENT_NOT_CREATED',
      );
    }

    const documentoId = Number(documento.id);

    const metadata = {
      ...row.metadata,
      destinoReservado: destination,
      promocionIdentity: identity,
      integration: {
        consumer:
          OP_RECIBO_HONORARIO_REGULARIZER_MATERIALIZATION,
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

  async confirmReciboHonorarioWithExecutor(
    tx: TmpConnection,
    params: {
      documentoId: number;
      archivoId: number;
      actor: ReciboHonorarioTempActor;
      humanValidatedData: Record<string, any>;
      ocrCandidate?: any;
    },
  ) {
    const {
      documentoId,
      archivoId,
      actor,
      humanValidatedData,
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
      documento.tipo_documental !==
        'RECIBO_HONORARIO' ||
      ['anulado', 'duplicado_versionado'].includes(
        String(documento.estado),
      )
    ) {
      throw new ConflictException(
        'RECIBO_HONORARIO_TEMP_DOCUMENT_CONFLICT',
      );
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
      ['anulado', 'duplicado_absorbido'].includes(
        String(archivo.estado),
      )
    ) {
      throw new ConflictException(
        'RECIBO_HONORARIO_TEMP_FILE_CONFLICT',
      );
    }

    const metadata: Record<string, any> = {
      ...(humanValidatedData ?? {}),
      tipoDocumental: 'RECIBO_HONORARIO',
      clienteAbreviatura: actor.empresaCodigo,
    };

    const clean = (value: any) => {
      if (value === null || value === undefined) {
        return null;
      }

      const text = String(value).trim();
      return text.length ? text : null;
    };

    const rucEmisor = clean(
      metadata.rucEmisor ??
        metadata.ruc ??
        metadata.rucProveedor,
    );
    const serie = clean(metadata.serie);
    const numero = clean(metadata.numero);
    const fechaEmision = clean(metadata.fechaEmision);
    const moneda = clean(metadata.moneda);
    const montoTotal = clean(metadata.montoTotal);

    const razonSocialEmisor = clean(
      metadata.razonSocialEmisor ??
        metadata.razonSocial ??
        metadata.proveedor,
    );

    const descripcionServicio = clean(
      metadata.descripcionServicio,
    );
    const retencion = clean(metadata.retencion);
    const montoNeto = clean(metadata.montoNeto);
    const observaciones = clean(
      metadata.observaciones ??
        metadata.observacion,
    );

    const faltantes: string[] = [];

    if (!fechaEmision) faltantes.push('fechaEmision');
    if (!serie) faltantes.push('serie');
    if (!numero) faltantes.push('numero');
    if (!rucEmisor) faltantes.push('rucEmisor');
    if (!montoTotal) faltantes.push('montoTotal');

    if (faltantes.length) {
      throw new ConflictException(
        `RECIBO_HONORARIO_TEMP_METADATA_INVALID:${faltantes.join(
          ',',
        )}`,
      );
    }

    metadata.rucEmisor = rucEmisor;
    metadata.ruc = rucEmisor;
    metadata.rucProveedor = rucEmisor;
    metadata.serie = serie;
    metadata.numero = numero;
    metadata.fechaEmision = fechaEmision;
    metadata.montoTotal = montoTotal;

    if (razonSocialEmisor) {
      metadata.razonSocialEmisor =
        razonSocialEmisor;
    }

    if (moneda) metadata.moneda = moneda;
    if (descripcionServicio) {
      metadata.descripcionServicio =
        descripcionServicio;
    }
    if (retencion) metadata.retencion = retencion;
    if (montoNeto) metadata.montoNeto = montoNeto;
    if (observaciones) {
      metadata.observaciones = observaciones;
    }

    const claveDocumental = buildClaveDocumental(
      actor.empresaCodigo,
      'RECIBO_HONORARIO',
      metadata,
    );

    if (!claveDocumental) {
      throw new ConflictException(
        'RECIBO_HONORARIO_TEMP_CLAVE_INVALID',
      );
    }

    metadata.claveDocumental = claveDocumental;

    const duplicados = await tx`
      SELECT d.id
      FROM documentos.documentos d
      WHERE d.cliente_abreviatura=${actor.empresaCodigo}
        AND d.id <> ${documentoId}
        AND COALESCE(d.estado, '') NOT IN (
          'anulado',
          'duplicado_versionado'
        )
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
        CASE
          WHEN d.clave_documental=${claveDocumental}
          THEN 0
          ELSE 1
        END,
        d.id ASC
      LIMIT 1
    `;

    if (duplicados[0]) {
      throw new ConflictException(
        'RECIBO_HONORARIO_TEMP_DOCUMENT_DUPLICATE',
      );
    }

    let ocrResultadoId: number | null = null;

    if (ocrCandidate) {
      const existingOcr = await tx`
        SELECT id
        FROM documentos.ocr_resultados
        WHERE documento_id=${documentoId}
          AND archivo_id=${archivoId}
          AND estado IN (
            'pendiente_validacion',
            'confirmado',
            'editado'
          )
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
            'RECIBO_HONORARIO',
            'pendiente_validacion',
            ${ocrCandidate.confidence ?? null},
            ${claveDocumental},
            ${JSON.stringify({
              ...(ocrCandidate.resultado ??
                ocrCandidate.metadata ??
                {}),
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
      tipoDocumental: 'RECIBO_HONORARIO',
      claveDocumental,
      validacionManual: {
        estado: 'confirmado',
        tipoDocumental: 'RECIBO_HONORARIO',
        claveDocumental,
        metadata,
        ocrResultadoId,
        validadoPor: actor.actorId,
      },
    };

    const [updated] = await tx`
      UPDATE documentos.documentos
      SET
        cliente_abreviatura=${actor.empresaCodigo},
        tipo_documental='RECIBO_HONORARIO',
        razon_social_emisor=${razonSocialEmisor},
        serie=${serie},
        numero=${numero},
        clave_documental=${claveDocumental},
        estado='confirmado',
        ruc_emisor=${rucEmisor},
        fecha_emision=${fechaEmision}::date,
        monto_total=${montoTotal}::numeric,
        metadata=${JSON.stringify(
          metadataDocumento,
        )}::jsonb,
        actualizado_en=now()
      WHERE id=${documentoId}
      RETURNING *
    `;

    await tx`
      INSERT INTO documentos.documentos_recibo_honorario (
        documento_id,
        serie,
        numero,
        ruc_emisor,
        razon_social_emisor,
        fecha_emision,
        moneda,
        descripcion_servicio,
        monto_total,
        retencion,
        monto_neto,
        observaciones
      )
      VALUES (
        ${documentoId},
        ${serie},
        ${numero},
        ${rucEmisor},
        ${razonSocialEmisor},
        ${fechaEmision}::date,
        ${moneda},
        ${descripcionServicio},
        ${montoTotal}::numeric,
        ${retencion}::numeric,
        ${montoNeto}::numeric,
        ${observaciones}
      )
      ON CONFLICT (documento_id)
      DO UPDATE SET
        serie=EXCLUDED.serie,
        numero=EXCLUDED.numero,
        ruc_emisor=EXCLUDED.ruc_emisor,
        razon_social_emisor=
          EXCLUDED.razon_social_emisor,
        fecha_emision=EXCLUDED.fecha_emision,
        moneda=EXCLUDED.moneda,
        descripcion_servicio=
          EXCLUDED.descripcion_servicio,
        monto_total=EXCLUDED.monto_total,
        retencion=EXCLUDED.retencion,
        monto_neto=EXCLUDED.monto_neto,
        observaciones=EXCLUDED.observaciones
    `;

    if (ocrResultadoId != null) {
      await tx`
        UPDATE documentos.ocr_resultados
        SET
          tipo_propuesto='RECIBO_HONORARIO',
          estado='confirmado',
          clave_documental=${claveDocumental},
          metadata=COALESCE(metadata, '{}'::jsonb)
            || jsonb_build_object(
              'estado', 'confirmado'::text,
              'tipoDocumental',
              'RECIBO_HONORARIO'::text,
              'tipoPropuesto',
              'RECIBO_HONORARIO'::text,
              'claveDocumental',
              ${claveDocumental}::text,
              'metadata',
              ${JSON.stringify(metadata)}::jsonb
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
    actor: ReciboHonorarioTempActor,
  ): Promise<ReciboHonorarioTempIds> {
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
        'RECIBO_HONORARIO_TEMP_CLAIM_CONFLICT',
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
      documento.tipo_documental !==
        'RECIBO_HONORARIO' ||
      ['anulado', 'duplicado_versionado'].includes(
        String(documento.estado),
      )
    ) {
      throw new ConflictException(
        'RECIBO_HONORARIO_TEMP_DOCUMENT_CONFLICT',
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
          'RECIBO_HONORARIO_TEMP_FILE_CONFLICT',
        );
      }

      archivoId = Number(existing.id);
    } else {
      const metadata = {
        rol: 'REGULARIZADOR_RECIBO_HONORARIO',
        tipoDocumental: 'RECIBO_HONORARIO',
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
          'REGULARIZADOR_RECIBO_HONORARIO'
        )
        RETURNING id
      `;

      if (!file?.id) {
        throw new ConflictException(
          'RECIBO_HONORARIO_TEMP_FILE_NOT_CREATED',
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
