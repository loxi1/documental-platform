import unittest

from app.extractors.pago_extractor import extract_pago_metadata


SMOKE_TEXT = """DOCUMENTO DE PRUEBA - NO VÁLIDO
CONSTANCIA DE TRANSFERENCIA - SMOKE FINANZAS
Banco
BCP - Banco de Crédito del Perú
N.° de operación
92568384
Fecha de operación
22/07/2026
Importe
S/ 720.27
Moneda
PEN
Concepto
Pago Factura F010-00011384
Referencia OC/OS
OC 008410
Datos relacionados para la prueba
Factura
F010-00011384
Proveedor
CORPORACION PROMATISA SOCIEDAD
RUC proveedor
20514753483
Fecha factura
21/07/2026
Importe factura
S/ 720.27
Centro de costo
040101
"""


class TransferenciaProveedorSmokeTest(unittest.TestCase):
    def test_extrae_proveedor_etiquetado_y_datos_clave(self):
        metadata = extract_pago_metadata(
            SMOKE_TEXT,
            "TRANSFERENCIA",
            "SMOKE_FINANZAS_TRANSFERENCIA_F010-00011384.pdf",
        )

        self.assertEqual(metadata["proveedorRuc"], "20514753483")
        self.assertEqual(
            metadata["proveedorNombre"],
            "CORPORACION PROMATISA SOCIEDAD",
        )
        self.assertEqual(metadata["documentoReferenciado"], "F010-00011384")
        self.assertEqual(metadata["numeroOperacion"], "92568384")
        self.assertEqual(metadata["montoTotal"], 720.27)
        self.assertEqual(metadata["moneda"], "PEN")


if __name__ == "__main__":
    unittest.main()
