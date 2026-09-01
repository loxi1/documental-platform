import { CARGA_SEGURA_FINGERPRINT_VERSION } from './carga-segura.constants';
import {
  calculateCargaSeguraFingerprint,
  canonicalizeJson,
} from './carga-segura.fingerprint';
import type { CargaSeguraFingerprintPayload } from './carga-segura.types';

const HASH = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function createPayload(
  overrides: Partial<CargaSeguraFingerprintPayload> = {},
): CargaSeguraFingerprintPayload {
  return {
    workspaceId: 1,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    expedienteId: 17,
    actorId: 1,
    canalIngreso: 'COMPRAS_UPLOAD_PRINCIPAL',
    tipoDocumental: 'OC',
    tipoRelacion: 'principal_oc',
    esPrincipal: true,
    nombreArchivo: 'orden-compra.pdf',
    contentType: 'application/pdf',
    tamanoBytes: 1024,
    hashSha256: HASH,
    ...overrides,
  };
}

describe('canonicalizeJson', () => {
  it('ordena recursivamente las claves', () => {
    const result = canonicalizeJson({
      z: 1,
      a: {
        y: true,
        b: null,
      },
    });

    expect(result).toBe('{"a":{"b":null,"y":true},"z":1}');
  });

  it('omite undefined y conserva null', () => {
    const result = canonicalizeJson({
      a: undefined,
      b: null,
    });

    expect(result).toBe('{"b":null}');
  });

  it('conserva el orden de arrays', () => {
    expect(canonicalizeJson([3, 1, 2])).toBe('[3,1,2]');
  });

  it('rechaza números no finitos', () => {
    expect(() => canonicalizeJson({ value: Number.NaN })).toThrow(
      'canonical-json-v1 no admite números no finitos',
    );
  });
});

describe('calculateCargaSeguraFingerprint', () => {
  it('produce SHA-256 hexadecimal y versión contractual', () => {
    const result = calculateCargaSeguraFingerprint(createPayload());

    expect(result.version).toBe(CARGA_SEGURA_FINGERPRINT_VERSION);

    expect(result.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('es estable ante distinto orden de propiedades', () => {
    const first = calculateCargaSeguraFingerprint(createPayload());

    const second = calculateCargaSeguraFingerprint({
      hashSha256: HASH,
      tamanoBytes: 1024,
      contentType: 'application/pdf',
      nombreArchivo: 'orden-compra.pdf',
      esPrincipal: true,
      tipoRelacion: 'principal_oc',
      tipoDocumental: 'OC',
      canalIngreso: 'COMPRAS_UPLOAD_PRINCIPAL',
      actorId: 1,
      expedienteId: 17,
      clienteDestinoId: 2,
      empresaCodigo: 'BBTI',
      workspaceId: 1,
    });

    expect(second.fingerprint).toBe(first.fingerprint);

    expect(second.canonicalJson).toBe(first.canonicalJson);
  });

  it('normaliza espacios y content type', () => {
    const first = calculateCargaSeguraFingerprint(createPayload());

    const second = calculateCargaSeguraFingerprint(
      createPayload({
        empresaCodigo: '  BBTI  ',
        contentType: ' APPLICATION/PDF ',
        hashSha256: HASH.toUpperCase(),
      }),
    );

    expect(second.fingerprint).toBe(first.fingerprint);
  });

  it('cambia cuando cambia un campo material', () => {
    const first = calculateCargaSeguraFingerprint(createPayload());

    const second = calculateCargaSeguraFingerprint(
      createPayload({
        expedienteId: 18,
      }),
    );

    expect(second.fingerprint).not.toBe(first.fingerprint);
  });

  it('conserva null como valor contractual', () => {
    const result = calculateCargaSeguraFingerprint(
      createPayload({
        clienteDestinoId: null,
        expedienteId: null,
        tipoRelacion: null,
      }),
    );

    expect(result.canonicalJson).toContain('"clienteDestinoId":null');
    expect(result.canonicalJson).toContain('"expedienteId":null');
    expect(result.canonicalJson).toContain('"tipoRelacion":null');
  });

  it('rechaza SHA-256 inválido', () => {
    expect(() =>
      calculateCargaSeguraFingerprint(
        createPayload({
          hashSha256: 'abc',
        }),
      ),
    ).toThrow('hashSha256 debe ser SHA-256 hexadecimal');
  });

  it('rechaza enteros no positivos', () => {
    expect(() =>
      calculateCargaSeguraFingerprint(
        createPayload({
          workspaceId: 0,
        }),
      ),
    ).toThrow('workspaceId debe ser un entero positivo');
  });

  it('no incorpora identificadores de transporte', () => {
    const result = calculateCargaSeguraFingerprint(createPayload());

    expect(result.canonicalJson).not.toContain('idempotencyKey');
    expect(result.canonicalJson).not.toContain('requestId');
    expect(result.canonicalJson).not.toContain('correlationId');
  });
});
