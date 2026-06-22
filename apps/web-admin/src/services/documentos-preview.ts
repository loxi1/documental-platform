import { api } from './api';

export type DocumentoArchivoPreview = {
  archivoId: number;
  filename: string;
  contentType: string;
  storageProvider: string;
  storageBucket?: string | null;
  storageKey: string;
  signedUrl: string;
  expiresIn: number;
  expiresAt: string;
};

function unwrapDeep<T = any>(payload: unknown): T {
  let current = payload as any;

  while (
    current &&
    typeof current === 'object' &&
    'data' in current &&
    current.data !== current
  ) {
    current = current.data;
  }

  return current as T;
}

export async function getDocumentoArchivoPreviewUrl(
  archivoId: number | string,
) {
  const { data } = await api.get(
    `/documentos/archivos/${archivoId}/preview-url`,
  );

  return unwrapDeep<DocumentoArchivoPreview>(data);
}
