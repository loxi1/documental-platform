from app.core.document_keys import build_document_key
from app.core.document_types import normalize_document_type
from app.extractors.pago_extractor import extract_pago_metadata

def main() -> None:
    assert normalize_document_type("PAGO_TRANSFERENCIA") == "TRANSFERENCIA"
    assert normalize_document_type("TRANSFERENCIA") == "TRANSFERENCIA"
    bcp = """
    CONSTANCIA DE TRANSFERENCIA BCP
    Número de Operación: 1041122
    Fecha: 26/06/2026
    Moneda: USD
    Importe de la operación: US$ 2,333.80
    Comisión bancaria: US$ 1.00
    Total debitado: US$ 2,334.80
    RUC 20600000001 CIMEDISA IMPORT SAC
    Referencia: F001-202693
    Estado: Procesada
    """
    m = extract_pago_metadata(bcp, "TRANSFERENCIA", "pago_transferencia_bcp_1041122.pdf")
    assert m["numeroOperacion"] == "1041122", m
    assert m["montoOperacion"] == 2333.80, m
    assert m["comision"] == 1.00, m
    assert m["montoTotalDebitado"] == 2334.80, m
    assert m["montoTotal"] == 2333.80, m
    assert m["moneda"] == "USD", m
    assert m["proveedorNombre"] == "CIMEDISA IMPORT SAC", m
    assert m["documentoReferenciado"] == "F001-202693", m
    assert m["estadoOperacion"] == "PROCESADA", m
    assert build_document_key("BBTI", "TRANSFERENCIA", m) == "BBTI|TRANSFERENCIA|1041122"
    solo_comision = """CONSTANCIA DE TRANSFERENCIA\nNúmero de Operación: 998877\nComisión bancaria: S/ 1.00"""
    sm = extract_pago_metadata(solo_comision, "TRANSFERENCIA")
    assert sm["montoTotal"] is None, sm
    detraccion = """BANCO DE LA NACION\nNúmero de Operación: 445566\nImporte: S/ 120.00"""
    dm = extract_pago_metadata(detraccion, "PAGO_DETRACCION")
    assert dm["numeroOperacion"] == "445566", dm
    assert dm["montoTotal"] == 120.0, dm
    print("PASS: extractor TRANSFERENCIA canónico y detracción compatibles")

if __name__ == "__main__":
    main()
