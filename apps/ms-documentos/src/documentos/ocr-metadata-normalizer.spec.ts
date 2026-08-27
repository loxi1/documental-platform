import { limpiarCamposLegacyOcr } from './ocr-metadata-normalizer';

describe('limpiarCamposLegacyOcr', () => {
  it('normaliza proveedorRuc a rucProveedor sin perder el dato', () => {
    expect(
      limpiarCamposLegacyOcr({
        metadata: {
          proveedorRuc: '20514753483',
          proveedorNombre: 'CORPORACION PROMATISA SOCIEDAD',
        },
      }),
    ).toEqual({
      metadata: {
        rucProveedor: '20514753483',
        proveedorNombre: 'CORPORACION PROMATISA SOCIEDAD',
      },
    });
  });

  it('normaliza compradorRuc a rucComprador', () => {
    expect(
      limpiarCamposLegacyOcr({
        metadata: {
          compradorRuc: '20565747356',
        },
      }),
    ).toEqual({
      metadata: {
        rucComprador: '20565747356',
      },
    });
  });

  it('preserva aliases canónicos ya existentes', () => {
    expect(
      limpiarCamposLegacyOcr({
        metadata: {
          rucProveedor: '20514753483',
          rucComprador: '20565747356',
        },
      }),
    ).toEqual({
      metadata: {
        rucProveedor: '20514753483',
        rucComprador: '20565747356',
      },
    });
  });
});
