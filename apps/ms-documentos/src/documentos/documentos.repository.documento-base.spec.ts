jest.mock('@documental/database', () => ({
  sql: {},
}));

import { DocumentosRepository } from './documentos.repository';

describe('DocumentosRepository - documentoBaseId con múltiples principales', () => {
  const repository = new DocumentosRepository();

  const principal = (id: number, tipo = 'OC') => ({
    documento_id: id,
    tipo_documental: tipo,
    estado: 'confirmado',
    tipo_relacion: tipo === 'OS' ? 'principal_os' : 'principal_oc',
    es_principal: true,
  });

  it('rechaza un adjunto sin documentoBaseId cuando hay múltiples principales', () => {
    expect(() =>
      (repository as any).resolverDocumentoBaseConfirmacion(
        {
          expedienteId: 15,
          documentoBaseId: undefined,
          esPrincipal: false,
          tipoRelacion: 'adjunto_factura',
        },
        [principal(43), principal(46)],
      ),
    ).toThrow();
  });

  it('acepta el principal explícito que pertenece al expediente', () => {
    expect(
      (repository as any).resolverDocumentoBaseConfirmacion(
        {
          expedienteId: 15,
          documentoBaseId: 43,
          esPrincipal: false,
          tipoRelacion: 'adjunto_factura',
        },
        [principal(43), principal(46)],
      ),
    ).toBe(43);
  });

  it('rechaza un principal inexistente o ajeno al expediente', () => {
    expect(() =>
      (repository as any).resolverDocumentoBaseConfirmacion(
        {
          expedienteId: 15,
          documentoBaseId: 999999,
          esPrincipal: false,
          tipoRelacion: 'adjunto_factura',
        },
        [principal(43), principal(46)],
      ),
    ).toThrow();
  });

  it('autoselecciona el único principal compatible', () => {
    expect(
      (repository as any).resolverDocumentoBaseConfirmacion(
        {
          expedienteId: 15,
          documentoBaseId: undefined,
          esPrincipal: false,
          tipoRelacion: 'adjunto_guia',
        },
        [principal(43)],
      ),
    ).toBe(43);
  });

  it('no exige documentoBaseId al confirmar un principal', () => {
    expect(
      (repository as any).resolverDocumentoBaseConfirmacion(
        {
          expedienteId: 15,
          documentoBaseId: undefined,
          esPrincipal: true,
          tipoRelacion: 'principal_oc',
        },
        [principal(43)],
      ),
    ).toBeNull();
  });

  it('rechaza un documento que no sea OC/OS como padre', () => {
    expect(() =>
      (repository as any).resolverDocumentoBaseConfirmacion(
        {
          expedienteId: 15,
          documentoBaseId: 44,
          esPrincipal: false,
          tipoRelacion: 'adjunto_guia',
        },
        [principal(44, 'FACTURA')],
      ),
    ).toThrow();
  });
});
