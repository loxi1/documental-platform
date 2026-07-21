import type { SecureUploadContext, SecureUploadIntent } from "@/types/documental-v2-carga-segura";

function sanitizeToken(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function createSecureUploadIntent(file: File, context: SecureUploadContext): SecureUploadIntent {
  const fingerprint = [
    file.name,
    file.size,
    file.type || "application/octet-stream",
    context.empresa,
    context.contextoLabel,
    context.documentoPrincipalLabel,
    context.tipoDocumentalEsperado,
    context.canalIngreso,
  ].join("|");

  const payloadFingerprintLocal = sanitizeToken(fingerprint) || "secure-upload-intent";

  return {
    idempotencyKey: `mock-idem-${payloadFingerprintLocal}`,
    payloadFingerprintLocal,
    createdAt: new Date().toISOString(),
    context,
    file: {
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
    },
  };
}
