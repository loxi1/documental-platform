jest.mock('@documental/database', () => ({
  sql: {},
}));

import { DocumentosRepository } from './documentos.repository';

describe('DocumentosRepository - identidad del emisor en GUIA_REMISION', () => {
  it('prioriza rucEmisor y sincroniza ruc/rucProveedor sin alterar rucComprador', () => {
    const repository = new DocumentosRepository();
    const metadata = {
      rucEmisor: '20100063680',
      ruc: '20100063680',
      rucProveedor: '20565747356',
      rucComprador: '20565747356',
    };

    (repository as any).normalizarIdentidadEmisorConfirmacion(
      'GUIA_REMISION',
      metadata,
    );

    expect(metadata).toEqual({
      rucEmisor: '20100063680',
      ruc: '20100063680',
      rucProveedor: '20100063680',
      rucComprador: '20565747356',
    });
  });

  it('no cambia la precedencia global para FACTURA', () => {
    const repository = new DocumentosRepository();
    const metadata = {
      rucEmisor: '20100063680',
      ruc: '20100063680',
      rucProveedor: '20565747356',
      rucComprador: '20565747356',
    };

    (repository as any).normalizarIdentidadEmisorConfirmacion(
      'FACTURA',
      metadata,
    );

    expect(metadata.rucProveedor).toBe('20565747356');
    expect(metadata.rucComprador).toBe('20565747356');
  });
});
